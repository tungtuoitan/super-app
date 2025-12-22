

#
# 
sudo systemctl reload nginx
 dotnet publish -c Release -o /var/www/Timeline/publish
sudo systemctl restart superapp-api.service
 sudo journalctl -u superapp-api.service -n 30 --no-pager (xem log)