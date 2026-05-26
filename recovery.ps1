# === LOCKME EMERGENCY RECOVERY ===
  # Run as Administrator

  # 1. Stop LockMe + disable autostart
  sc.exe stop LockMe
  sc.exe config LockMe start= demand

  # 2. Stop watchdog
  schtasks /End /TN "LockMeWatchdog" 2>$null
  schtasks /Change /TN "LockMeWatchdog" /DISABLE 2>$null

  # 3. Reset DNS
  Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
      Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ServerAddresses ('8.8.8.8','1.1.1.1')
  }
  Clear-DnsClientCache

  # 4. Clear PAC + proxy in HKCU
  $ie = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
  Remove-ItemProperty -Path $ie -Name AutoConfigURL -ErrorAction SilentlyContinue
  Set-ItemProperty -Path $ie -Name ProxyEnable -Value 0 -ErrorAction SilentlyContinue

  # 5. Clear PAC + proxy in ALL HKEY_USERS hives
  Get-ChildItem 'Registry::HKEY_USERS' | ForEach-Object {
      $p = Join-Path $_.PSPath 'Software\Microsoft\Windows\CurrentVersion\Internet Settings'
      if (Test-Path $p) {
          Remove-ItemProperty -Path $p -Name AutoConfigURL -ErrorAction SilentlyContinue
          Set-ItemProperty -Path $p -Name ProxyEnable -Value 0 -ErrorAction SilentlyContinue
      }
  }

  # 6. Clear Chrome/Edge HKLM policies
  $chrome = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
  $edge   = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'
  Remove-ItemProperty -Path $chrome -Name ProxyMode   -ErrorAction SilentlyContinue
  Remove-ItemProperty -Path $chrome -Name ProxyPacUrl -ErrorAction SilentlyContinue
  Remove-ItemProperty -Path $edge   -Name ProxyMode   -ErrorAction SilentlyContinue
  Remove-ItemProperty -Path $edge   -Name ProxyPacUrl -ErrorAction SilentlyContinue

  # 7. Reset WinHTTP system proxy
  netsh winhttp reset proxy

  # 8. Verify
  Write-Host "`n=== VERIFY ==="
  nslookup google.com 8.8.8.8
  Test-NetConnection claudible.io -Port 443 -InformationLevel Quiet