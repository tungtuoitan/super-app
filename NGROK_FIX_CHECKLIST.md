# ✅ Fix Google OAuth với ngrok - Checklist

## ❌ Lỗi hiện tại:
```json
{
  "error": "invalid_grant",
  "error_description": "Bad Request"
}
```

**Nguyên nhân**: Redirect URI không khớp giữa frontend và backend khi exchange code

---

## ✅ Đã fix (Backend):

### 1. ✅ `appsettings.pro.json` - Thêm đầy đủ path
```json
"OAuth": {
  "Google": {
    "RedirectUri": "https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback"
    // ← Đã thêm /auth/callback (trước đó thiếu!)
  }
}
```

### 2. ✅ `AllowedOrigins` - Thêm ngrok URL
```json
"AllowedOrigins": [
  "https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev"
]
```

---

## 📋 Các bước cần làm:

### 1. ✅ Google Cloud Console - Add Authorized Redirect URI

**QUAN TRỌNG**: Phải thêm exact URL này vào Google Cloud Console:

```
https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback
```

**Cách làm**:
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. **APIs & Services** → **Credentials**
4. Click vào OAuth 2.0 Client ID: `887853390661-j2bepobhb90k357d0k5p1atqd2k8oe6l`
5. Trong **Authorized redirect URIs**, click **+ ADD URI**
6. Paste: `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback`
7. Click **SAVE**
8. Đợi 5-10 phút để thay đổi có hiệu lực

---

### 2. 🔄 Restart Backend

Backend cần reload config để apply changes:

**Nếu đang chạy dotnet run**:
```bash
# Ctrl+C để stop
# Sau đó chạy lại:
cd C:/Users/Admin/source/Timeline/SuperAppAPI
dotnet run --environment Production
```

**Nếu đang chạy như service**:
```bash
sudo systemctl restart superapp-backend
```

**Hoặc đơn giản**:
- Stop backend process
- Start lại

---

### 3. 🧪 Test lại Google Login

1. Vào: `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev`
2. Click **"Sign in with Google"**
3. Kiểm tra browser address bar khi redirect về:
   - ✅ Phải là: `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback?code=...`
   - ❌ Không được là localhost
4. Login thành công → Redirect về workspace

---

## 🐛 Nếu vẫn lỗi:

### Lỗi: Vẫn "invalid_grant"

**Check 1**: Google Console đã save chưa?
- Vào lại Credentials → OAuth Client
- Xem có URL `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback` trong list không

**Check 2**: Backend đã restart chưa?
- Restart để reload `appsettings.pro.json`

**Check 3**: Đợi vài phút
- Google có thể mất 5-10 phút để propagate changes

**Check 4**: Clear browser cache
- Ctrl+Shift+Delete → Clear cache
- Hoặc thử Incognito mode

---

### Lỗi: CORS error

**Frontend console hiển thị**:
```
Access to XMLHttpRequest at 'https://...ngrok-free.dev/api/auth/google/login'
from origin 'https://...ngrok-free.dev' has been blocked by CORS policy
```

**Fix**: Đã thêm ngrok URL vào `AllowedOrigins` rồi → Restart backend

---

### Lỗi: "redirect_uri_mismatch"

**Frontend console/network tab**:
```
Error: redirect_uri_mismatch
```

**Nghĩa là**: Google Console chưa có redirect URI

**Fix**: Quay lại bước 1, add vào Google Console

---

## 📊 Debug Checklist:

Sử dụng checklist này để verify từng bước:

- [ ] Google Cloud Console có `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback` trong Authorized redirect URIs
- [ ] `appsettings.pro.json` có `RedirectUri: "https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback"`
- [ ] `AllowedOrigins` có `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev`
- [ ] Backend đã restart để load config mới
- [ ] Ngrok đang chạy và forward đến localhost:3000
- [ ] Frontend đang chạy trên localhost:3000
- [ ] Browser đã clear cache hoặc dùng Incognito

---

## 🔍 Verify Redirect URI đang dùng:

### Check Frontend:
Mở browser console trên `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev`:
```javascript
console.log(window.location.origin);
// Should print: https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev
```

### Check Backend:
Thêm log tạm vào `AuthService.cs:177`:
```csharp
var redirectUri = _configuration["OAuth:Google:RedirectUri"] ?? "";
_logger.LogInformation("Using redirect_uri: {RedirectUri}", redirectUri);
```

Check backend logs khi login → Phải thấy:
```
Using redirect_uri: https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev/auth/callback
```

---

## ⚠️ Lưu ý quan trọng về ngrok FREE tier:

**Mỗi lần restart ngrok**, URL sẽ thay đổi:
```
https://abc123.ngrok-free.dev  (session 1)
https://xyz789.ngrok-free.dev  (session 2 - sau khi restart)
```

**Khi đó phải**:
1. Update `appsettings.pro.json` với URL mới
2. Update Google Cloud Console với redirect URI mới
3. Update `AllowedOrigins` với URL mới
4. Restart backend

**Để tránh phải update liên tục** → Xem xét:
- Dùng **Cloudflare Tunnel** (miễn phí, URL cố định)
- Hoặc upgrade **ngrok paid** ($8/tháng) để có static domain

---

**Cập nhật**: 2025-12-23
