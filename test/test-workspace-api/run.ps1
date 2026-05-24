<#
.SYNOPSIS
  Workspace /tree/v2 load test runner.

.EXAMPLES
  # Full flow: seed users -> clone data -> prewarm tokens -> test -> cleanup
  .\run.ps1 -Full

  # Just run k6 (data already cloned, tokens already warm)
  .\run.ps1

  # Custom load
  .\run.ps1 -Vus 500 -Steady 2m

.NOTES
  Requires loadtest/ folder set up first (.env, seeded users).
#>

[CmdletBinding()]
param(
    [switch]$Full,
    [switch]$Clone,
    [switch]$Cleanup,
    [int]$Vus,
    [string]$RampUp,
    [string]$Steady,
    [string]$RampDown,
    [string]$BaseUrl
)

$ErrorActionPreference = "Stop"
$root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$loadtest = Resolve-Path "$root\..\loadtest"
Set-Location $root

if (-not (Test-Path "$loadtest\.env")) {
    Write-Host "Missing $loadtest\.env. Set up loadtest/ folder first." -ForegroundColor Red
    exit 1
}

# Load loadtest/.env
Get-Content "$loadtest\.env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $kv = $line -split "=", 2
    if ($kv.Length -eq 2) {
        $key = $kv[0].Trim()
        $val = $kv[1].Trim().Trim('"').Trim("'")
        Set-Item -Path "Env:$key" -Value $val
    }
}

if ($Vus)      { $env:VUS       = "$Vus" }
if ($RampUp)   { $env:RAMP_UP   = $RampUp }
if ($Steady)   { $env:STEADY    = $Steady }
if ($RampDown) { $env:RAMP_DOWN = $RampDown }
if ($BaseUrl)  { $env:LOADTEST_BASE_URL = $BaseUrl }

# k6 binary (reuse loadtest's portable copy)
$k6Cmd = $null
$gc = Get-Command k6 -ErrorAction SilentlyContinue
if ($gc) { $k6Cmd = $gc.Source }
if (-not $k6Cmd -and (Test-Path "$loadtest\bin\k6.exe")) { $k6Cmd = "$loadtest\bin\k6.exe" }
if (-not $k6Cmd) {
    Write-Host "Missing k6. Install or run loadtest/run.ps1 once to fetch the portable binary." -ForegroundColor Red
    exit 1
}

# Install npm deps
if (-not (Test-Path "$root\node_modules")) {
    Write-Host "Installing npm deps..." -ForegroundColor Cyan
    npm install --silent
}

# Full flow: seed users (in loadtest), prewarm tokens, clone data here
if ($Full) {
    Write-Host ""
    Write-Host "=== SEED USERS ===" -ForegroundColor Cyan
    Push-Location $loadtest
    node seed-users.js
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    Pop-Location
}

if ($Full -or $Clone) {
    Write-Host ""
    Write-Host "=== CLONE DATA ===" -ForegroundColor Cyan
    node clone-data.js
    if ($LASTEXITCODE -ne 0) { Write-Host "Clone failed." -ForegroundColor Red; exit $LASTEXITCODE }
}

if ($Full) {
    Write-Host ""
    Write-Host "=== PREWARM TOKENS ===" -ForegroundColor Cyan
    Push-Location $loadtest
    $env:PREWARM_CONCURRENCY = "8"
    node prewarm-tokens.js
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    Pop-Location
}

# Run k6
Write-Host ""
Write-Host "=== TREE LOAD TEST ===" -ForegroundColor Cyan
if (-not (Test-Path "$root\results")) { New-Item -ItemType Directory -Path "$root\results" | Out-Null }

$baseUrl = $env:LOADTEST_BASE_URL
if (-not $baseUrl) { $baseUrl = "http://localhost:5000" }

$vusDisp    = if ($env:VUS)       { $env:VUS }       else { "200" }
$rampUpDisp = if ($env:RAMP_UP)   { $env:RAMP_UP }   else { "30s" }
$steadyDisp = if ($env:STEADY)    { $env:STEADY }    else { "1m" }
$rampDnDisp = if ($env:RAMP_DOWN) { $env:RAMP_DOWN } else { "15s" }
Write-Host "  Target:  $baseUrl"
Write-Host "  VUs:     $vusDisp"
Write-Host "  Stages:  $rampUpDisp -> $steadyDisp -> $rampDnDisp"
Write-Host ""

$k6Args = @("run", "-e", "BASE_URL=$baseUrl")
if ($env:VUS)       { $k6Args += @("-e", "VUS=$($env:VUS)") }
if ($env:RAMP_UP)   { $k6Args += @("-e", "RAMP_UP=$($env:RAMP_UP)") }
if ($env:STEADY)    { $k6Args += @("-e", "STEADY=$($env:STEADY)") }
if ($env:RAMP_DOWN) { $k6Args += @("-e", "RAMP_DOWN=$($env:RAMP_DOWN)") }
$k6Args += "--console-output"
$k6Args += "$root\results\k6-tree.log"
$k6Args += "k6\scenario-tree.js"

& $k6Cmd @k6Args
$k6Exit = $LASTEXITCODE

if ($Cleanup) {
    Write-Host ""
    Write-Host "=== CLEANUP DATA ===" -ForegroundColor Cyan
    node cleanup-data.js
    Push-Location $loadtest
    node cleanup-users.js
    Pop-Location
}

if ($k6Exit -ne 0) {
    Write-Host ""
    Write-Host "k6 thresholds crossed (exit $k6Exit). See results\." -ForegroundColor Yellow
    exit $k6Exit
}

Write-Host ""
Write-Host "All done." -ForegroundColor Green
