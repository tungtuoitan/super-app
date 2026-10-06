<#
.SYNOPSIS
  Restore SuperApp-test from the frozen .bak (~10-30s).

.NOTES
  If BE is running and pointed at SuperApp-test, this kicks its EF connections.
  Restart 'dotnet run' afterwards for a clean pool state.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$loadtest = Resolve-Path "$root\..\loadtest"
Set-Location $root

if (-not (Test-Path "$loadtest\.env")) {
    Write-Host "Missing $loadtest\.env." -ForegroundColor Red
    exit 1
}

# .env chứa tham chiếu vault:// -> chạy lại script trong `secret run` (tung-vault, #1502)
. "$root\..\vault-env.ps1"
Invoke-SelfInSecretRun -EnvFile "$loadtest\.env" -ScriptPath $MyInvocation.MyCommand.Path -BoundParameters $PSBoundParameters
Import-DotEnv "$loadtest\.env"
if (Test-Path "$root\.env") {
    Import-DotEnv "$root\.env"
}

node scripts\restore.js
exit $LASTEXITCODE
