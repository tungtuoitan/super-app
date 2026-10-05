/*
**Fullpath:** /test/perf/db/03-backup-perf-db.sql
Backup SuperApp-perf (data seed sạch) -> /var/opt/mssql/data/SuperApp-perf.bak (ghi đè), nén.
Chạy: ./vps-sql.sh db/03-backup-perf-db.sql master
*/
SET NOCOUNT ON;
BACKUP DATABASE [SuperApp-perf] TO DISK = N'/var/opt/mssql/data/SuperApp-perf.bak'
WITH INIT, FORMAT, COMPRESSION, STATS = 25;
