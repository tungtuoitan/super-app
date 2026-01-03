# 🚀 Setup ngrok cho Google OAuth (Nhanh nhất để test)

## Tại sao dùng ngrok?

- ✅ Setup cực nhanh (5 phút)
- ✅ Tự động HTTPS
- ✅ Free tier available
- ⚠️ Free tier: URL ngẫu nhiên mỗi lần restart (e.g., `https://abc123.ngrok.io`)
- 💰 Static domain: $8/tháng

---

## 📝 Bước 1: Cài đặt ngrok

### Trên Production Server (Linux):

```bash
# Download ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz

# Extract
tar -xvzf ngrok-v3-stable-linux-amd64.tgz

# Move to /usr/local/bin
sudo mv ngrok /usr/local/bin/

# Verify
ngrok version
```

### Hoặc trên Windows (Local test):
1. Download từ [ngrok.com](https://ngrok.com/download)
2. Extract zip file
3. Chạy `ngrok.exe`

---

## 🔧 Bước 2: Đăng ký ngrok account (FREE)

1. Vào [ngrok.com](https://ngrok.com)
2. Sign up (free)
3. Copy authtoken từ dashboard

---

## 🔑 Bước 3: Add authtoken

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

---

## 🚀 Bước 4: Start tunnel

### Tunnel cho Frontend (port 3000):
```bash
ngrok http 3000
```

Output:
```
Session Status                online
Account                       your@email.com (Plan: Free)
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

**Copy URL**: `https://abc123.ngrok.io` ← Đây là public URL của bạn

### Tunnel cả Frontend + Backend (2 ports):

**Terminal 1** (Frontend):
```bash
ngrok http 3000 --region=us --log=stdout
```

**Terminal 2** (Backend):
```bash
ngrok http 5000 --region=us --log=stdout
```

---

## ⚙️ Bước 5: Update Google Cloud Console

**Authorized redirect URIs**:
```
https://abc123.ngrok.io/auth/callback
```

⚠️ **Lưu ý**: Mỗi lần restart ngrok (free tier), URL sẽ thay đổi → Phải update lại Google Console

---

## 🔄 Bước 6: Update Config (Temporary)

### Frontend `.env` (Temporary override):
```env
REACT_APP_GOOGLE_REDIRECT_URI=https://abc123.ngrok.io/auth/callback
```

### Backend `appsettings.json` (Temporary):

```json
{
    "OAuth": {
        "Google": {
            "RedirectUri": "https://abc123.ngrok.io/auth/callback"
        }
    }
}
```

### Rebuild frontend:
```bash
npm run build
```

---

## ✅ Test

1. Vào `https://abc123.ngrok.io`
2. Click "Sign in with Google"
3. Login thành công
4. Kiểm tra redirect về ngrok URL

---

## 💰 Upgrade to Static Domain (Optional)

**Nếu muốn URL cố định** (`https://superapp.ngrok.app`):

1. Upgrade to paid plan ($8/tháng)
2. Reserve static domain
3. Start tunnel với domain cố định:
    ```bash
    ngrok http 3000 --domain=superapp.ngrok.app
    ```

---

## 🐛 Troubleshooting

### "ERR_NGROK_108" - Domain already in use
- Ngrok free tier chỉ cho 1 tunnel cùng lúc
- Stop tunnel cũ trước khi start tunnel mới

### "Tunnel not found"
- Check frontend/backend có đang chạy trên localhost:3000, localhost:5000 không
- Restart ngrok

### CORS error
- Thêm ngrok URL vào `AllowedOrigins` trong backend
- Rebuild backend

---

## 📊 So sánh Free Solutions

| Solution              | URL cố định? | HTTPS      | Chi phí  | Setup time |
| --------------------- | ------------ | ---------- | -------- | ---------- |
| **ngrok (free)**      | ❌ Thay đổi  | ✅ Yes     | Free     | 5 phút     |
| **ngrok (paid)**      | ✅ Static    | ✅ Yes     | $8/tháng | 5 phút     |
| **Cloudflare Tunnel** | ✅ Static    | ✅ Yes     | Free     | 15 phút    |
| **Mua domain**        | ✅ Static    | ⚠️ Cần SSL | ~$10/năm | 30 phút    |

---

## 💡 Recommendation

### Để test nhanh (vài ngày):

→ **ngrok free tier** (đơn giản nhất)

### Để dùng lâu dài (free):

→ **Cloudflare Tunnel** (ổn định, miễn phí)

### Để production thực sự:

→ **Mua domain** + SSL certificate (professional)

---

**Cập nhật**: 2025-12-23
