#

- đẩy code lên
- update .env / node_module
- build be: dotnet publish -c Release -o /var/www/Timeline/publish
- chạy lại be: sudo systemctl restart superapp-api.service
- build fe:
- chạy lại fe: sudo systemctl reload nginx

# flow production

ngrok (port 80)
↓
Nginx/Apache (localhost:80)
↓ proxy
├─ / → Frontend (localhost:3000)
└─ /api → Backend (localhost:5000)
