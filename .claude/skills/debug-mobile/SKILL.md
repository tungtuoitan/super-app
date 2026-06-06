---
name: debug-mobile
description: Setup và debug SuperApp trên mobile (Android + Chrome DevTools USB/WiFi). Bao gồm cấu hình IP local, firewall, HMR, xem log/network qua ADB WiFi hoặc Eruda, và các gotcha đã gặp.
---

# Mobile Debug — SuperApp

## Setup tổng quan

| Item | Value |
|------|-------|
| FE port | 3000 |
| BE port | 5000 |
| Laptop WiFi IP | `192.168.2.26` |
| Subnet | `192.168.2.0/24` |
| Phone truy cập FE | `http://192.168.2.26:3000` |
| Phone gọi API | `http://192.168.2.26:5000` |

---

## Cách 1 — USB + Port Forwarding (không cần cùng mạng)

Dùng khi laptop không kết nối WiFi hoặc cần debug nhanh.

1. Cắm USB, bật **USB Debugging** trên phone
2. Mở `chrome://inspect/#devices` trên laptop
3. Vào **Port forwarding**, thêm 2 rule:
   ```
   3000 → localhost:3000
   5000 → localhost:5000
   ```
4. Phone mở `http://localhost:3000`

Không cần sửa bất kỳ config nào. HMR hoạt động bình thường qua USB.

---

## Cách 2 — Cùng WiFi + Local IP

Dùng khi muốn test trên nhiều thiết bị cùng lúc không cần USB.

### Bước 1 — Lấy IP WiFi của laptop

```powershell
Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 | Select-Object IPAddress
```

> IP hiện tại: `192.168.2.26`
> Lưu ý: `192.168.2.1` là Ethernet static IP — **không dùng cái này**.

### Bước 2 — Cấu hình FE (`craco.config.js`)

```js
devServer: {
    hot: true,
    liveReload: true,
    host: "0.0.0.0",           // bind ra ngoài, không chỉ localhost
    allowedHosts: "all",
    client: {
        webSocketURL: "auto://0.0.0.0:0/ws",  // HMR WebSocket theo host của page
    },
},
```

### Bước 3 — Cấu hình API URL (`.env.development.local`)

```
REACT_APP_LOCAL_API_URL=http://192.168.2.26:5000
```

Bắt buộc restart `npm start` sau khi sửa `.env`.

### Bước 4 — BE bind ra ngoài (`launchSettings.json`)

File: `C:\Users\Admin\source\Timeline\SuperAppAPI\Properties\launchSettings.json`

```json
"applicationUrl": "http://0.0.0.0:5000"
```

Áp dụng cho tất cả profiles (`SuperAppAPI`, `SuperAppAPI (with browser)`).

### Bước 5 — BE CORS (`Startup.cs`)

File: `C:\Users\Admin\source\Timeline\SuperAppAPI\Startup.cs`

Thêm vào `DevelopmentPolicy`:
```csharp
"http://192.168.2.26:3000",
```

### Bước 6 — Firewall

Firewall rule `SuperApp BE 5000` đã tồn tại (allow TCP 5000 inbound, All profiles).
Firewall rule `SuperApp FE 3000` đã tạo (allow TCP 3000 inbound, All profiles).

**Gotcha quan trọng**: WiFi network profile mặc định là **Public**. Trên profile Public, `LocalFirewallRules: N/A (GPO-store only)` — tức là local rules bị ignore, phone không reach được.

Đổi sang Private (cần PowerShell as Administrator):
```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
```

Nếu GPO block, thử registry (cũng cần admin):
```powershell
# Tìm GUID network hiện tại
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles\*" |
    Where-Object { $_.ProfileName -eq "KhongBiet" } |
    Select-Object PSChildName, Category

# Đổi Category: 0=Public, 1=Private
Set-ItemProperty -Path "HKLM:\...\{GUID}" -Name "Category" -Value 1
```

---

## Xem Console / Network trên mobile

### Cách 1 — ADB over WiFi (Android 11+, không cần USB)

1. Trên phone: **Developer Options → Wireless debugging → bật on**
2. Tap vào "Wireless debugging" → lấy **IP:port** và **pairing code**
3. Trên laptop (PowerShell):
```powershell
adb pair 192.168.2.XX:PAIRING_PORT   # nhập pairing code khi hỏi
adb connect 192.168.2.XX:DEBUG_PORT
```
4. Vào `chrome://inspect/#devices` trên laptop — phone hiện ra như USB
5. Click **inspect** → có đầy đủ Console, Network, Elements

### Cách 2 — Eruda (inject vào app, không cần ADB)

Thêm tạm vào `public/index.html`:
```html
<script src="//cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>
```
Trên phone xuất hiện nút floating → tap → có Console, Network, Elements ngay trên browser. Nhớ xóa trước khi commit.

---

## Checklist khi "API pending / refuse to connect"

```
[ ] BE đang listen trên 0.0.0.0 chưa?
    → netstat -ano | findstr :5000
    → Phải thấy: 0.0.0.0:5000  LISTENING (không phải 127.0.0.1:5000)

[ ] Laptop và phone cùng mạng không?
    → Get-NetIPAddress -AddressFamily IPv4 (xem cột Wi-Fi)
    → 169.254.x.x = APIPA = chưa có DHCP lease = không kết nối được

[ ] WiFi profile có phải Private không?
    → Get-NetConnectionProfile
    → Public → local firewall rules bị ignore → phone không vào được

[ ] Test port từ laptop:
    → Test-NetConnection -ComputerName 192.168.2.26 -Port 5000
    → TcpTestSucceeded = True: laptop tự kết nối OK
    → Nếu OK từ laptop nhưng phone vẫn không được → firewall / network profile

[ ] CORS đã có origin của mobile chưa?
    → Startup.cs DevelopmentPolicy phải có "http://192.168.2.26:3000"
    → Restart BE sau khi sửa

[ ] Phone và laptop có thực sự cùng subnet không?
    → ipconfig (laptop) → xem Default Gateway của Wi-Fi
    → Settings > WiFi > IP trên phone → phải cùng x.x.x.* với laptop
    → Nếu khác subnet: toggle WiFi off/on trên phone (xả DHCP lease cũ)

[ ] Firewall rule cho port 3000 đã tồn tại chưa?
    → Get-NetFirewallRule -DisplayName "SuperApp FE 3000"
    → Nếu chưa: New-NetFirewallRule -DisplayName "SuperApp FE 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
    → Cần chạy PowerShell as Administrator
```

---

## Các vấn đề đã gặp & cách fix

### 1. FE "refuse to connect" sau HMR reload

**Nguyên nhân**: HMR WebSocket kết nối về `localhost:3000` — trên phone `localhost` = chính phone.

**Fix**: Thêm vào `craco.config.js`:
```js
client: { webSocketURL: "auto://0.0.0.0:0/ws" }
```

### 2. API pending đến timeout (dù FE vào được)

**Nguyên nhân A**: BE vẫn bind `localhost:5000` (chưa restart sau khi sửa `launchSettings.json`).
→ Kiểm tra `netstat`: phải là `0.0.0.0:5000`, không phải `127.0.0.1:5000`.

**Nguyên nhân B**: WiFi profile là **Public** → `LocalFirewallRules: N/A` → local allow rule bị bỏ qua.
→ Đổi sang Private (xem Bước 6 ở trên).

### 3. Dùng sai IP (`192.168.2.1` thay vì `192.168.2.26`)

`192.168.2.1` là Ethernet static IP, không phải WiFi.
Luôn dùng `Get-NetIPAddress -InterfaceAlias "Wi-Fi"` để lấy IP đúng.

### 4. Phone và laptop khác subnet (192.168.1.x vs 192.168.2.x)

**Nguyên nhân**: Phone đang giữ DHCP lease cũ từ mạng khác. Khi kết nối lại WiFi, nó dùng luôn lease cũ thay vì xin IP mới từ AP hiện tại.

**Fix**: Toggle WiFi off/on trên phone → buộc DHCP discovery từ đầu → nhận đúng IP `192.168.2.x`.

**Cách confirm**: `ipconfig` trên laptop xem Default Gateway của Wi-Fi — phone phải cùng subnet với gateway đó.

### 5. Laptop WiFi disconnect (169.254.x.x)

`169.254.x.x` = APIPA = WiFi không lấy được DHCP lease.
→ Kiểm tra `netsh wlan show interfaces | Select-String "State"`
→ Nếu `disconnected`: kết nối WiFi lại, hoặc dùng Cách 1 (USB).

---

## Tab behavior trên mobile

Một số tab type được config để **không restore trên mobile** (tránh crash hoặc UX kém):

| Tab type | Mobile |
|----------|--------|
| `multiProject` | Không restore |

Implement: `mobileExcludedTypes` trong `tabPersistence` của module, check trong `useTabBarSync.ts`.

Để thêm tab type khác vào danh sách, sửa `tabPersistence` trong module tương ứng:
```ts
tabPersistence: {
    mobileExcludedTypes: ["multiProject", "tênTabKhác"],
    ...
}
```

---

## ActivityBar trên mobile

Mobile chỉ hiển thị **K module** trong ActivityBar.

Implement: `ActivityBar.tsx` filter `horizontal && m.id !== "K"`:
```ts
if (horizontal && m.id !== "K") return false;
```

`horizontal={true}` được truyền vào ActivityBar khi `isMobile` trong `VSCodeLayout.tsx`.
