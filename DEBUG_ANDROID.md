# Debug app trên Android (qua USB + Chrome DevTools)

Ghi chú lại toàn bộ setup + các vấn đề đã gặp khi debug SuperApp trên điện thoại Android, kèm hướng giải quyết. Không phải tutorial chung, chỉ tập trung vào những thứ thực tế trong project này.

---

## 1. Setup ban đầu

**Trên điện thoại**
- Settings → About phone → tap **Build number** 7 lần để mở Developer options.
- Developer options → bật **USB debugging**.
- Cắm USB → popup "Allow USB debugging?" → **Allow** (tick "Always allow from this computer").

**Trên desktop (Chrome)**
- Mở `chrome://inspect/#devices` → tick **Discover USB devices**.
- Sau khi điện thoại được nhận, tab Chrome đang mở trên mobile sẽ hiện ra → bấm **inspect**.
- Có full DevTools (Console, Network, Performance) đang chạy trên data của mobile.

---

## 2. Hai cách connect mobile → BE

### Cách A: Port forwarding qua USB

`chrome://inspect/#devices` → nút **Port forwarding…**:
```
3000 → localhost:3000
5000 → localhost:5000
```

Trên mobile mở `http://localhost:3000` — Chrome tunnel qua USB về desktop.

**Ưu**: không cần đổi gì (FE/BE giữ nguyên `localhost`), origin = `localhost` nên là **secure context** → `crypto.subtle` chạy được, Google OAuth redirect URI khớp với cấu hình đã đăng ký.

**Nhược**: hay drop kết nối — rút USB, sleep máy, Chrome crash → phải mở lại port forwarding. Trải nghiệm thực tế: **không ổn định**.

### Cách B: LAN IP

Mobile + PC cùng Wi-Fi. Mobile mở `http://<PC-LAN-IP>:3000` (ví dụ `http://192.168.2.1:3000`).

Để chạy được cần đụng cả 3 chốt: secure context, BE config, Google redirect URI. Xem tiếp.

---

## 3. Vấn đề: `crypto.subtle` undefined trên LAN IP

Triệu chứng:
```
TypeError: Cannot read properties of undefined (reading 'digest')
  at generateCodeChallenge
```

Lý do: WebCrypto API (`window.crypto.subtle`) chỉ tồn tại trong **secure context** = HTTPS hoặc `http://localhost`. `http://192.168.x.x` không phải secure context → `crypto.subtle = undefined`.

### Giải pháp: SHA-256 fallback thuần JS

Đã thêm vào `src/shared/auth/pkce.utils.ts`:

```ts
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
        const digest = await crypto.subtle.digest("SHA-256", data);
        return base64UrlEncode(new Uint8Array(digest));
    }
    return base64UrlEncode(sha256Fallback(data));
}
```

`sha256Fallback` là implementation FIPS 180-4 thuần JS (~80 dòng), không cần thư viện. `crypto.getRandomValues` thì vẫn chạy ở insecure context theo spec — không cần fallback.

### Giải pháp B (không sửa code): Chrome flag

Trên Chrome cả desktop + mobile:
```
chrome://flags/#unsafely-treat-insecure-origin-as-secure
→ Enabled
→ nhập origin: http://192.168.2.1:3000
→ Relaunch
```

Verify: trong Console gõ `window.isSecureContext` → phải = `true`. Nếu không, flag chưa apply (typo origin hoặc chưa Relaunch).

Hai cách bù nhau: flag dễ chỉnh nhưng phải làm từng máy; fallback ăn liền nhưng tốn ~80 dòng code.

---

## 4. Vấn đề: BE đang bind `localhost`, mobile không gọi được

Mặc định ASP.NET Core listen `localhost:5000` → chỉ chính máy đó nối được. Mobile call vào sẽ `ERR_CONNECTION_REFUSED`.

### Sửa launchSettings.json

`SuperAppAPI/Properties/launchSettings.json`:
```json
"applicationUrl": "http://0.0.0.0:5000"
```

`0.0.0.0` = bind mọi network interface, kể cả LAN.

### Mở firewall Windows

```powershell
New-NetFirewallRule -DisplayName "SuperApp BE 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### CORS allow LAN origin

`SuperAppAPI/Startup.cs` thêm vào `DevelopmentPolicy`:
```csharp
.SetIsOriginAllowed(origin =>
{
    if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
    {
        var host = uri.Host;
        return host.StartsWith("192.168.") ||
               host.StartsWith("10.") ||
               host.StartsWith("172.") ||
               host == "localhost" ||
               host.EndsWith(".nip.io") ||
               host.EndsWith(".sslip.io");
    }
    return false;
})
```

Đỡ phải maintain whitelist thủ công khi đổi mạng.

### Verify

Từ desktop: `curl http://192.168.2.1:5000` → trả `Welcome to SuperApp API`.
Từ mobile (DevTools Console):
```js
fetch("http://192.168.2.1:5000", {credentials:"include"}).then(r=>r.text()).then(console.log)
```

---

## 5. Vấn đề: Google không cho redirect URI là IP

Khi đăng ký `http://192.168.2.1:3000/auth/callback` trong Google Cloud Console:
```
Invalid Redirect: must end with a public top-level domain
Invalid Redirect: must use a domain that is a valid top private domain
```

Google chỉ accept `localhost` hoặc public TLD.

### Workaround: nip.io / sslip.io

DNS service public, resolve hostname → IP. `192.168.2.1` thành `192-168-2-1.nip.io`.
- Đăng ký được vì `.io` là public TLD.
- DNS resolve về IP LAN → mobile vẫn nối qua Wi-Fi nội bộ.
- CORS đã allow `*.nip.io` ở bước trên.

### Workaround: ngrok

```powershell
ngrok http 3000
```
URL kiểu `https://xxx.ngrok-free.app` → HTTPS thật → secure context → không cần fallback PKCE. Free plan đổi URL mỗi lần restart.

### Workaround: bỏ Google OAuth, dùng password login

Nhanh nhất cho test. BE đã có sẵn `POST /api/auth/login` (BCrypt). Đã thêm `POST /api/auth/signup` để tạo tài khoản test:

```powershell
curl.exe -X POST http://localhost:5000/api/auth/signup -F "email=test@local.dev" -F "password=test123"
```

UI password login đã thêm vào `AccountsDialog.tsx`.

---

## 6. Redirect URI auto-detect

Trước đây `getRedirectUri()` hardcode `localhost:3000`. Sau khi thêm:
```ts
const getRedirectUri = (): string => {
    if (envConfig.REACT_APP_GOOGLE_REDIRECT_URI) return envConfig.REACT_APP_GOOGLE_REDIRECT_URI;
    if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
    return "http://localhost:3000/auth/callback";
};
```

→ PC mở `localhost` thì redirect URI = `localhost`; mobile mở LAN IP / nip.io thì redirect URI = origin đó.

Lưu ý: tất cả các origin dùng đều phải đăng ký vào **Authorized redirect URIs** + **Authorized JavaScript origins** trong Google Console.

---

## 7. Mirror log ra Console để xem trên DevTools

`src/shared/debug/debugLog.store.ts` đã thêm:
```ts
console.log(`[${category}] ${event}`, data ?? "");
```
trong `add()`. Mọi log của `debugLog.log(...)` giờ hiện thẳng ở Console DevTools mobile (qua chrome://inspect). Không phải đợi `flush()` lên BE.

Nếu cần production-clean, gate lại bằng `import.meta.env.DEV` hoặc `process.env.NODE_ENV !== "production"`.

---

## 8. Performance debugging cho touch drag

Vấn đề: drag handle ở mobile cảm giác lag.

### Logs đã add

`src/shell/components/VSCodeResizeHandle.tsx`:
- `pointerdown / pointermove-sample (mỗi 5 move) / pointerup`
- Mỗi event ghi `dtMs`, `avgDtMs`, `moveCount`, `approxFps`.

`src/shell/components/main/VSCodeLayout.tsx`:
- `onLayout` mỗi tick của `PanelGroup`: `tick`, `dtMs`.
- `render` count + gap giữa các render.
- `render-slow` chỉ log khi render > 4ms.

### Cách đọc

| Triệu chứng | Kết luận |
|-------------|----------|
| `pointermove dtMs > 30ms` | Pointer pipeline bị nghẽn (touch event delivery) |
| `onLayout dtMs > 16ms` đều | react-resizable-panels không kịp một frame |
| `render-slow durMs > 16ms` | Children re-render quá nặng → memo |
| Numbers đẹp nhưng vẫn cảm giác lag | DevTools/USB overhead, hoặc paint/composite — đo bằng Performance tab |

### Quan sát thực tế

Log mẫu: `pointermove avg 15ms (~67Hz)`, `onLayout avg 8-12ms` → numbers OK, không phải pointer/layout pipeline. Nghi can chính:
1. `MobileSidebarContent` + `VSEditorArea` chưa memo, re-render mỗi tick.
2. `console.log` mirror đang ship qua USB → DevTools mobile có thể chính nó là bottleneck. Test bằng cách tắt DevTools rồi drag — nếu mượt = production OK.

### Performance tab (chuẩn xác nhất)

`chrome://inspect` → inspect → **Performance** → Record → drag 2-3s → Stop:
- **Frames** lane: thấy fps tụt đoạn nào.
- **Main** lane: long task (vàng/đỏ) → click để xem call stack.

---

## 9. Checklist khi setup lại trên máy mới

1. [ ] Mobile: bật USB debugging.
2. [ ] Desktop Chrome: `chrome://inspect/#devices` → tick Discover USB.
3. [ ] BE: `launchSettings.json` bind `0.0.0.0:5000`.
4. [ ] BE: firewall allow port 5000.
5. [ ] BE: CORS allow LAN/nip.io origin (đã có `SetIsOriginAllowed`).
6. [ ] FE: `getRedirectUri()` auto-detect origin (đã có).
7. [ ] PKCE: `sha256Fallback` đã có (cho insecure context).
8. [ ] FE: `.env` set `REACT_APP_LOCAL_API_URL` đúng IP nếu cần (hoặc bỏ trống dùng default).
9. [ ] Google Console: đăng ký mọi origin/redirect URI sẽ test.
10. [ ] Test: `window.isSecureContext` + `window.crypto.subtle` trên mobile DevTools Console.

---

## 10. Gotchas

- **IP LAN đổi sau restart router** → cần đăng ký lại Google Console (hoặc dùng ngrok).
- **Cookie `Secure` flag**: BE đặt `Secure = !env.IsDevelopment()` → dev mode cookie qua HTTP OK; production phải HTTPS.
- **`SameSite=Strict`** cho refresh cookie: nếu đổi origin (localhost ↔ LAN IP) browser xem là cross-site, cookie không gửi → 401 ở `/refresh`. Login lại trên origin nào thì F5 trên đúng origin đó.
- **Cache cũ trong localStorage**: profile từ login cũ có thể `userId: null` (bug parse response trước đó). Xóa key `USER_PROFILE` rồi login lại.
- **Pointer event trên iOS Safari**: chỉ có `touchstart/touchmove/touchend`, không phải `pointerdown/pointermove/pointerup`. Hiện code dùng `onPointerDownCapture` — Chrome iOS thì OK, Safari iOS không trigger. Chưa test.
