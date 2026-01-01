
# backend
1. đứng ở /SuperAppAPI và chạy: dotnet publish -c Release -o /var/www/Timeline/publish
2. reload: sudo systemctl reload nginx
sudo journalctl -u superapp-api.service -n 30 --no-pager (xem log)


# fe
- npm run build
- restart: sudo systemctl restart superapp-api.service
