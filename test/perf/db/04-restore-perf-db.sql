/*
**Fullpath:** /test/perf/db/04-restore-perf-db.sql
Đưa SuperApp-perf về đúng data seed (xoá mọi thứ load test đã ghi). Đá kết nối đang mở (BE perf
nên restart sau đó cho pool sạch).
Chạy: ./vps-sql.sh db/04-restore-perf-db.sql master
*/
SET NOCOUNT ON;
IF DB_ID(N'SuperApp-perf') IS NOT NULL
    ALTER DATABASE [SuperApp-perf] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [SuperApp-perf] FROM DISK = N'/var/opt/mssql/data/SuperApp-perf.bak'
WITH REPLACE, RECOVERY, STATS = 25;
ALTER DATABASE [SuperApp-perf] SET MULTI_USER;
