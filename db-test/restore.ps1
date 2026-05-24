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
Get-Content "$loadtest\.env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $kv = $line -split "=", 2
    if ($kv.Length -eq 2) {
        Set-Item -Path "Env:$($kv[0].Trim())" -Value ($kv[1].Trim().Trim('"').Trim("'"))
    }
}
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

node scripts\restore.js
exit $LASTEXITCODE
