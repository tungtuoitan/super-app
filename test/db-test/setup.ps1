<#
.SYNOPSIS
  One-time setup of SuperApp-test: clone schema, seed users, clone data, backup.

.DESCRIPTION
  Run once to build the frozen baseline. After this, use restore.ps1 (or
  test-workspace-api with -Restore flag) to reset between tests.

.EXAMPLES
  .\setup.ps1                  # full build + backup
  .\setup.ps1 -SkipBackup      # build but don't backup yet (preview)
  .\setup.ps1 -SkipUsers       # rebuild data only (users already seeded)

.NOTES
  Reads ..\loadtest\.env for DB credentials and loadtest user config.
  Reads .\.env for TEST_DB_NAME and TEST_DB_BACKUP_PATH (or uses defaults).
#>

[CmdletBinding()]
param(
    [switch]$SkipUsers,
    [switch]$SkipData,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$loadtest = Resolve-Path "$root\..\loadtest"
$wsApi    = Resolve-Path "$root\..\test-workspace-api"
Set-Location $root

# Load loadtest\.env (DB creds, loadtest user config)
if (-not (Test-Path "$loadtest\.env")) {
    Write-Host "Missing $loadtest\.env. Set up loadtest/ first." -ForegroundColor Red
    exit 1
}
Get-Content "$loadtest\.env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $kv = $line -split "=", 2
    if ($kv.Length -eq 2) {
        Set-Item -Path "Env:$($kv[0].Trim())" -Value ($kv[1].Trim().Trim('"').Trim("'"))
    }
}

# Load db-test\.env if present
if (Test-Path "$root\.env") {
    Get-Content "$root\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $kv = $line -split "=", 2
        if ($kv.Length -eq 2) {
            Set-Item -Path "Env:$($kv[0].Trim())" -Value ($kv[1].Trim().Trim('"').Trim("'"))
        }
    }
}

if (-not $env:TEST_DB_NAME) { $env:TEST_DB_NAME = "SuperApp-test" }
if (-not $env:TEST_DB_BACKUP_PATH) { $env:TEST_DB_BACKUP_PATH = "/var/opt/mssql/data/SuperApp-test.bak" }

# Install npm deps once
if (-not (Test-Path "$root\node_modules")) {
    Write-Host "Installing db-test npm deps..." -ForegroundColor Cyan
    npm install --silent
}

Write-Host ""
Write-Host "=== Test DB setup ===" -ForegroundColor Cyan
Write-Host "  Source schema: $($env:DB_NAME)"
Write-Host "  Target:        $($env:TEST_DB_NAME)"
Write-Host "  Backup path:   $($env:TEST_DB_BACKUP_PATH)"
Write-Host ""

# Step 1: clone schema
Write-Host "--- 1/4 Clone schema ---" -ForegroundColor Cyan
node scripts\clone-schema.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Step 2: seed users into TEST_DB
if (-not $SkipUsers) {
    Write-Host ""
    Write-Host "--- 2/4 Seed users into $($env:TEST_DB_NAME) ---" -ForegroundColor Cyan
    Push-Location $loadtest
    $env:DB_NAME_BACKUP = $env:DB_NAME
    $env:DB_NAME = $env:TEST_DB_NAME
    try {
        node seed-users.js
        if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    } finally {
        $env:DB_NAME = $env:DB_NAME_BACKUP
        Remove-Item Env:DB_NAME_BACKUP
    }
    Pop-Location
} else {
    Write-Host "--- 2/4 SKIPPED (-SkipUsers) ---" -ForegroundColor DarkGray
}

# Step 3: clone full data into TEST_DB (set-based pure SQL)
if (-not $SkipData) {
    Write-Host ""
    Write-Host "--- 3/4 Clone full data into $($env:TEST_DB_NAME) ---" -ForegroundColor Cyan
    node scripts\clone-all.js
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "--- 3/4 SKIPPED (-SkipData) ---" -ForegroundColor DarkGray
}

# Step 4: backup
if (-not $SkipBackup) {
    Write-Host ""
    Write-Host "--- 4/4 BACKUP DATABASE ---" -ForegroundColor Cyan
    node scripts\backup.js
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "--- 4/4 SKIPPED (-SkipBackup) ---" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Point BE at the test DB before testing:" -ForegroundColor White
Write-Host "      `$env:ConnectionStrings__SuperAppConnection='Server=$($env:DB_SERVER),$($env:DB_PORT);Database=$($env:TEST_DB_NAME);User Id=$($env:DB_USER);Password=...;TrustServerCertificate=True;Encrypt=False'" -ForegroundColor DarkGray
Write-Host "      `$env:ConnectionStrings__UserProfileConnection=`$env:ConnectionStrings__SuperAppConnection" -ForegroundColor DarkGray
Write-Host "      cd C:\Users\Admin\source\Timeline\SuperAppAPI; dotnet run" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  - Reset between test runs:" -ForegroundColor White
Write-Host "      cd db-test; .\restore.ps1" -ForegroundColor DarkGray
