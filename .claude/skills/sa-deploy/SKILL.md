---
name: sa-deploy
description: Deploy SuperApp to production — pull latest code, build FE, publish BE, restart services, check logs.
---

# Deploy SuperApp to Production

Deploy the latest code from GitHub to the production server at `157.66.101.51`.

## Server Info

| Detail | Value |
|--------|-------|
| Host | `157.66.101.51` |
| User | `root` |
| Auth | SSH key — alias `vps-superapp` trong `~/.ssh/config` (VPS tắt `PasswordAuthentication`, không dùng password) |
| Public domain | `https://www.tungle.uk` |

## Server Layout

| Component | Path | Notes |
|-----------|------|-------|
| FE source | `/var/www/SuperApp/` | git repo — branch `master` |
| FE build output | `/var/www/SuperApp/build/` | served by nginx |
| BE source | `/var/www/Timeline/` | git repo — branch `master` |
| BE publish target | `/var/www/Timeline/publish/` | dotnet publish output |
| FE service | `nginx` | serves `/var/www/SuperApp/build`, proxies `/api` → port 5000 |
| BE service | `superapp-api.service` | systemd, runs `dotnet SuperAppAPI.dll` |

## SSH Method

Dùng SSH key qua alias `vps-superapp` (VPS đã tắt đăng nhập bằng password — không
dùng paramiko + password, không đọc password ở đâu cả; secret: skill `credential-ops`):

```bash
ssh -o BatchMode=yes vps-superapp 'cd /var/www/Timeline && git pull origin master 2>&1'
```

- Gọi từ PowerShell mà ssh Windows báo "Bad permissions" thư mục `.ssh` → dùng
  `"C:/Program Files/Git/usr/bin/ssh.exe"`.
- Lệnh dài (build FE 3–5 phút) → đặt timeout tool đủ lớn (600s).

## Full Deploy Steps (FE + BE)

Chạy từng bước bằng `ssh vps-superapp '<lệnh>'` (hoặc gộp nhiều lệnh bằng `&&` trong 1 lần ssh):

1. **Git pull FE** — `cd /var/www/SuperApp && git pull origin master 2>&1`
2. **Git pull BE** — `cd /var/www/Timeline && git pull origin master 2>&1`
3. **Build FE** — `cd /var/www/SuperApp && npm run build 2>&1` *(timeout 600s — takes ~3–5 min)*
4. **Publish BE** — `cd /var/www/Timeline/SuperAppAPI && dotnet publish -c Release -o /var/www/Timeline/publish 2>&1` *(timeout 300s)*
5. **Restart BE** — `systemctl restart superapp-api.service && echo 'BE OK'`
6. **Restart nginx** — `systemctl restart nginx && echo 'nginx OK'`
7. **Verify** — `systemctl status superapp-api.service --no-pager | head -20`
8. **Logs** — `journalctl -u superapp-api.service -n 30 --no-pager 2>&1`

## Partial Deploy Options

**FE only** (e.g. UI-only changes, no API changes):
- Pull FE → build FE → restart nginx

**BE only** (e.g. API-only changes, no UI changes):
- Pull BE → publish BE → restart BE service

**Check logs only**:
```bash
journalctl -u superapp-api.service -n 50 --no-pager
```

## Healthy Service Output

A healthy `superapp-api.service` status looks like:
```
Active: active (running) since ...
Main PID: ... (dotnet)
Memory: ~65-80M
```

Startup log lines to look for:
- `✓ Loaded .env file from: /var/www/Timeline/.env`
- `>>  >>  >>  Starting up the SuperApp application...`

## Common Issues

| Symptom | Fix |
|---------|-----|
| `npm run build` fails with TS error | Check the error — likely a type issue introduced in the latest commit |
| BE service fails to start | Check `journalctl -u superapp-api.service -n 50` for startup exception |
| nginx 502 | BE not running — restart `superapp-api.service` |
| Old FE still showing | Hard refresh browser (Ctrl+Shift+R) — nginx is serving new build already |
| `git pull` conflict | `git stash && git pull` then check `git stash list` |

## Task

{{USER_TASK}}

Based on the task (e.g. "deploy FE only", "deploy both", "check logs", "restart BE"), execute the appropriate subset of steps above via `ssh vps-superapp`. Always show the final service status and last few log lines to confirm success.
