

#
- đẩy code lên
- update .env / node_module
- build be: dotnet publish -c Release -o /var/www/Timeline/publish
- chạy lại be: sudo systemctl restart superapp-api.service
- build fe:
- chạy lại fe: sudo systemctl reload nginx