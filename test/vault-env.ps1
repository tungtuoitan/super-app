# Dùng chung cho script test: .env chứa tham chiếu vault:// (tung-vault, #1502).
# Dot-source ở đầu script:  . "$PSScriptRoot\..\vault-env.ps1"
#
# DB đi qua SSH tunnel 127.0.0.1:14330 (Timeline\scripts\run-dev.ps1 tự mở tunnel).

# Nếu $EnvFile có vault:// và chưa ở trong secret run: chạy lại chính script gọi
# bên trong `secret run --env-file` (giá trị thật vào env process con) rồi exit.
function Invoke-SelfInSecretRun {
    param([string]$EnvFile, [string]$ScriptPath, [hashtable]$BoundParameters)
    if ($env:SUPERAPP_TEST_IN_SECRET_RUN) { return }
    if (-not (Select-String -Path $EnvFile -Pattern '=\s*vault://' -Quiet)) { return }
    $vault = if ($env:TUNG_VAULT) { $env:TUNG_VAULT } else { Join-Path $HOME 'source\tung-vault' }
    if (-not (Test-Path "$vault\secret.ps1")) { throw "Không thấy tung-vault ở $vault (đặt `$env:TUNG_VAULT)" }
    $env:SUPERAPP_TEST_IN_SECRET_RUN = '1'
    $childArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $ScriptPath)
    foreach ($p in $BoundParameters.GetEnumerator()) {
        if ($p.Value -is [switch]) { if ($p.Value) { $childArgs += "-$($p.Key)" } }
        else { $childArgs += @("-$($p.Key)", "$($p.Value)") }
    }
    & "$vault\secret.ps1" run --env-file $EnvFile -- (Join-Path $PSHOME 'powershell.exe') @childArgs
    exit $LASTEXITCODE
}

# Nạp .env vào process hiện tại; bỏ qua vault:// (secret run đã giải mã sẵn).
function Import-DotEnv {
    param([string]$Path)
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $kv = $line -split "=", 2
        if ($kv.Length -ne 2) { return }
        $val = $kv[1].Trim().Trim('"').Trim("'")
        if ($val.StartsWith("vault://")) { return }
        Set-Item -Path "Env:$($kv[0].Trim())" -Value $val
    }
}
