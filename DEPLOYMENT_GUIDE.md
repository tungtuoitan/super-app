# SuperApp – Production Technology Stack Summary

## 1. Tổng quan kiến trúc

SuperApp được triển khai theo mô hình **Frontend (SPA) + Backend API**, chạy trên cùng một server Linux (Ubuntu), phía trước là **Nginx** làm reverse proxy.

```
Client (Browser)
   │
   │ HTTP/HTTPS
   ▼
Nginx (Port 80)
   ├── /            → React Build (Static files)
   └── /api/*       → ASP.NET Core API (Kestrel :5000)
```

---

## 2. Frontend (FE)

### Công nghệ
- **React (CRA – Create React App)**
- Node.js + npm
- Build ra static files (`build/`)

### Environment Variables
- Chỉ các biến có prefix `REACT_APP_` mới được sử dụng
- Dùng file:
  - `.env.production` (production build)

Ví dụ:
```env
REACT_APP_API_BASE_URL=
GENERATE_SOURCEMAP=false
```

> Lưu ý: CRA **inject biến env tại build-time**, không phải runtime

### Build Frontend
```bash
npm ci
npm run build
```

### Deploy FE
- Copy nội dung `build/` vào thư mục serve của nginx
- Ví dụ:
```bash
/var/www/SuperApp/frontend/build
```

---

## 3. Backend (BE)

### Công nghệ
- **ASP.NET Core Web API**
- Chạy bằng **Kestrel**
- Không expose trực tiếp ra internet

### Build Backend
```bash
dotnet restore
dotnet publish -c Release -o publish
```

### Run Backend
- Chạy bằng `systemd service`
- Listen tại:
```
127.0.0.1:5000
```

> Backend **chỉ bind localhost**, an toàn hơn

---

## 4. Reverse Proxy – Nginx

### Vai trò
- Serve static React files
- Proxy API requests sang .NET
- Là cổng duy nhất public ra ngoài (port 80)

### Routing logic
- `/` → React SPA
- `/api/*` → `http://127.0.0.1:5000`

### Ví dụ config (rút gọn)
```nginx
server {
    listen 80;

    root /var/www/SuperApp/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

---

## 5. Process Management

### Backend
- Quản lý bằng **systemd**
- Auto start khi reboot

### Frontend
- Static files → không cần process manager

---

## 6. Security Best Practices

- Không expose port 5000 ra ngoài
- FE gọi API qua relative path `/api`
- Không commit `.env`, `.env.production`
- Dùng nginx làm lớp bảo vệ đầu tiên

---

## 7. Deployment Checklist

- [x] Build React bằng `.env.production`
- [x] Build & publish .NET Release
- [x] Backend listen localhost
- [x] Nginx proxy `/api` → backend
- [x] FE gọi API bằng `/api`
- [x] systemd quản lý backend

---

## 8. Tổng kết

| Layer | Công nghệ |
|-----|----------|
| Frontend | React (CRA) |
| Backend | ASP.NET Core |
| Web Server | Nginx |
| Process | systemd |
| OS | Ubuntu Linux |

➡️ Kiến trúc đơn giản, ổn định, dễ scale, đúng chuẩn production cho SPA + API.

