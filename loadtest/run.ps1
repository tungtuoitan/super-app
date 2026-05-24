<#
.SYNOPSIS
  One-shot runner for SuperApp load testing.

.EXAMPLES
  .\run.ps1 -Seed -Cleanup
  .\run.ps1
  .\run.ps1 -Vus 500 -Steady 2m
  .\run.ps1 -Seed -SkipTest
#>

[CmdletBinding()]
param(
    [switch]$Seed,
    [switch]$Cleanup,
    [switch]$SkipTest,
    [switch]$Prewarm,
    [switch]$NoAuth,
    [int]$Vus,
    [string]$RampUp,
    [string]$Steady,
    [string]$RampDown,
    [string]$BaseUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Sanity
if (-not (Test-Path "$root\.env")) {
    Write-Host "No .env found. Copying from .env.example - please fill in DB_PASSWORD." -ForegroundColor Yellow
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "Edit $root\.env then re-run." -ForegroundColor Yellow
    exit 1
}

# Load .env into the current process
Get-Content "$root\.env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $kv = $line -split "=", 2
    if ($kv.Length -eq 2) {
        $key = $kv[0].Trim()
        $val = $kv[1].Trim().Trim('"').Trim("'")
        Set-Item -Path "Env:$key" -Value $val
    }
}

# CLI overrides win over .env
if ($Vus)      { $env:VUS       = "$Vus" }
if ($RampUp)   { $env:RAMP_UP   = $RampUp }
if ($Steady)   { $env:STEADY    = $Steady }
if ($RampDown) { $env:RAMP_DOWN = $RampDown }
if ($BaseUrl)  { $env:LOADTEST_BASE_URL = $BaseUrl }

# Tool checks
function Require-Cmd($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "Missing '$name'. $hint" -ForegroundColor Red
        exit 1
    }
}
Require-Cmd "node" "Install Node 18+ from https://nodejs.org/"
Require-Cmd "npm"  "Comes with Node."

# Resolve k6: prefer global, fall back to local bin/k6.exe
$k6Cmd = $null
$gc = Get-Command k6 -ErrorAction SilentlyContinue
if ($gc) { $k6Cmd = $gc.Source }
if (-not $k6Cmd -and (Test-Path "$root\bin\k6.exe")) { $k6Cmd = "$root\bin\k6.exe" }
if (-not $SkipTest -and -not $k6Cmd) {
    Write-Host "Missing 'k6'. Install: winget install k6 --source winget   (or)   choco install k6" -ForegroundColor Red
    exit 1
}

# Install npm deps once
if (-not (Test-Path "$root\node_modules")) {
    Write-Host "Installing npm deps ..." -ForegroundColor Cyan
    npm install --silent
}

# Seed
if ($Seed) {
    Write-Host ""
    Write-Host "=== SEED ===" -ForegroundColor Cyan
    node seed-users.js
    if ($LASTEXITCODE -ne 0) { Write-Host "Seed failed." -ForegroundColor Red; exit $LASTEXITCODE }
}

# Prewarm tokens (for no-auth scenario)
if ($Prewarm) {
    Write-Host ""
    Write-Host "=== PREWARM TOKENS ===" -ForegroundColor Cyan
    node prewarm-tokens.js
    if ($LASTEXITCODE -ne 0) { Write-Host "Prewarm failed." -ForegroundColor Red; exit $LASTEXITCODE }
}

# Run k6
if (-not $SkipTest) {
    Write-Host ""
    Write-Host "=== LOAD TEST ===" -ForegroundColor Cyan

    if (-not (Test-Path "$root\results")) { New-Item -ItemType Directory -Path "$root\results" | Out-Null }

    $baseUrl = $env:LOADTEST_BASE_URL
    if (-not $baseUrl) { $baseUrl = "http://localhost:5000" }

    $vusDisp    = if ($env:VUS)       { $env:VUS }       else { "1000" }
    $rampUpDisp = if ($env:RAMP_UP)   { $env:RAMP_UP }   else { "2m" }
    $steadyDisp = if ($env:STEADY)    { $env:STEADY }    else { "5m" }
    $rampDnDisp = if ($env:RAMP_DOWN) { $env:RAMP_DOWN } else { "1m" }
    Write-Host "  Target:  $baseUrl"
    Write-Host "  VUs:     $vusDisp"
    Write-Host "  Stages:  $rampUpDisp -> $steadyDisp -> $rampDnDisp"
    Write-Host ""

    $k6Args = @(
        "run",
        "-e", "BASE_URL=$baseUrl",
        "-e", "USER_COUNT=$($env:LOADTEST_USER_COUNT)",
        "-e", "EMAIL_PREFIX=$($env:LOADTEST_EMAIL_PREFIX)",
        "-e", "EMAIL_DOMAIN=$($env:LOADTEST_EMAIL_DOMAIN)",
        "-e", "PASSWORD=$($env:LOADTEST_PASSWORD)"
    )
    if ($env:VUS)       { $k6Args += @("-e", "VUS=$($env:VUS)") }
    if ($env:RAMP_UP)   { $k6Args += @("-e", "RAMP_UP=$($env:RAMP_UP)") }
    if ($env:STEADY)    { $k6Args += @("-e", "STEADY=$($env:STEADY)") }
    if ($env:RAMP_DOWN) { $k6Args += @("-e", "RAMP_DOWN=$($env:RAMP_DOWN)") }

    if ($NoAuth) {
        if (-not (Test-Path "$root\results\tokens.json")) {
            Write-Host "No tokens.json. Run with -Prewarm first (or pass -Prewarm -NoAuth together)." -ForegroundColor Red
            exit 1
        }
        Write-Host "  Mode:    no-auth (prewarmed tokens)"
        $k6Args += "k6\scenario-noauth.js"
    } else {
        Write-Host "  Mode:    full (login per VU)"
        $k6Args += "k6\scenario.js"
    }

    & $k6Cmd @k6Args
    $k6Exit = $LASTEXITCODE
} else {
    $k6Exit = 0
}

# Cleanup
if ($Cleanup) {
    Write-Host ""
    Write-Host "=== CLEANUP ===" -ForegroundColor Cyan
    node cleanup-users.js
    if ($LASTEXITCODE -ne 0) { Write-Host "Cleanup failed." -ForegroundColor Red; exit $LASTEXITCODE }
}

if ($k6Exit -ne 0) {
    Write-Host ""
    Write-Host "k6 exited with thresholds failing or errors (exit $k6Exit). See results\." -ForegroundColor Yellow
    exit $k6Exit
}

Write-Host ""
Write-Host "All done." -ForegroundColor Green
