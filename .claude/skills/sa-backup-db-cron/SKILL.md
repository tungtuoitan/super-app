---
name: sa-backup-db-cron
description: Manage the SuperApp production database backup cron job on the VPS — check status, view logs, update schedule, fix issues.
---

You are managing the **SuperApp production DB backup cron job** on the VPS.

## Infrastructure

| Item | Value |
|------|-------|
| VPS host | `157.66.101.51` |
| VPS user | `root` |
| SSH method | Python paramiko (sshpass not available on Windows) |
| DB engine | SQL Server (native, not Docker) |
| DB name | `SuperApp-pro` |
| DB user/pass | `sa` / see `.claude/skills/credentials.local.md` (gitignored — never put the real value back in this file, see issue 0044 of TungRoot) |
| sqlcmd path | `/opt/mssql-tools18/bin/sqlcmd` |
| Backup dir | `/var/opt/mssql/backup/` |
| Backup script | `/root/backup-superapp.sh` |
| Log file | `/var/log/superapp-backup.log` |
| Cron schedule | `0 6 * * *` (06:00 Asia/Ho_Chi_Minh daily) |
| Google Drive remote | `rclone` with remote named `gdrive:` |
| Google Drive folder | `gdrive:` root = **BackupDB** (folder ID `1hDxMlsP4y6NV7p_fBogvo-La3iRSw0ia`) |
| Local retention | 14 days (`find ... -mtime +14 -delete`) |

## SSH Template (always use paramiko)

```python
import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("157.66.101.51", username="root", password="<read from .claude/skills/credentials.local.md>", timeout=30)

def run(cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err
```

Run via PowerShell: write script to a variable then pipe to `python`.

## Backup Script (`/root/backup-superapp.sh`)

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/var/opt/mssql/backup"
BACKUP_FILE="$BACKUP_DIR/SuperApp-pro_${DATE}.bak"
LOG_FILE="/var/log/superapp-backup.log"
GDRIVE_FOLDER="gdrive:"
KEEP_DAYS=14

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ===== Backup start =====" >> "$LOG_FILE"

/opt/mssql-tools18/bin/sqlcmd -S localhost,1433 -U sa -P '<read from .claude/skills/credentials.local.md>' -No -Q "
BACKUP DATABASE [SuperApp-pro]
TO DISK = N'${BACKUP_FILE}'
WITH FORMAT, INIT, COMPRESSION;
" >> "$LOG_FILE" 2>&1

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup OK: $BACKUP_FILE ($SIZE)" >> "$LOG_FILE"
    rclone copy "$BACKUP_FILE" "$GDRIVE_FOLDER" -v >> "$LOG_FILE" 2>&1
    if [ $? -eq 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploaded to $GDRIVE_FOLDER" >> "$LOG_FILE"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Upload failed" >> "$LOG_FILE"
        exit 1
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup file not created" >> "$LOG_FILE"
    exit 1
fi

find "$BACKUP_DIR" -name "SuperApp-pro_*.bak" -mtime +${KEEP_DAYS} -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned local files older than ${KEEP_DAYS} days" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ===== Backup done =====" >> "$LOG_FILE"
```

## Common Tasks

### Check cron job status
```bash
crontab -l
```

### View recent logs
```bash
tail -30 /var/log/superapp-backup.log
```

### Run backup manually
```bash
bash /root/backup-superapp.sh
```

### List local backup files
```bash
ls -lh /var/opt/mssql/backup/SuperApp-pro_*.bak | tail -10
```

### List Google Drive backups
```bash
rclone ls gdrive: | grep SuperApp-pro
```

### Restore cron job if missing
```bash
(crontab -l 2>/dev/null; echo '0 6 * * * /root/backup-superapp.sh >> /var/log/superapp-backup.log 2>&1') | sort -u | crontab -
```

## Task: {{USER_TASK}}

Based on the user's request, use paramiko to SSH into the VPS and perform the appropriate action (check status, view logs, run manual backup, update script, fix cron, etc.). Always show the result — log tail or file listing — to confirm success.
