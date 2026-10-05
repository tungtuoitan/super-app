/*
**Fullpath:** /test/perf/db/01-create-perf-db.sql

Tạo DB `SuperApp-perf` RỖNG với schema giống hệt SuperApp-dev (= schema code master), rồi bổ sung các
index CHỈ có trên prod (pro.task.ix_task_*) để số đo phản ánh prod.

- DBCC CLONEDATABASE chỉ copy schema (NO_STATISTICS: không mang thống kê của dev sang, để optimizer
  dựa trên data perf thật sau khi seed). Bản clone mặc định read-only -> chuyển READ_WRITE.
- Recovery SIMPLE: seed hàng trăm nghìn dòng không làm phình log.
- Xoá SuperApp-perf cũ nếu có (chỉ đúng tên này — không bao giờ đụng dev/pro/test).

Chạy: ./vps-sql.sh db/01-create-perf-db.sql master
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
USE master;

IF DB_ID(N'SuperApp-perf') IS NOT NULL
BEGIN
    ALTER DATABASE [SuperApp-perf] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [SuperApp-perf];
    PRINT N'Đã xoá SuperApp-perf cũ';
END
GO

DBCC CLONEDATABASE ([SuperApp-dev], [SuperApp-perf]) WITH NO_STATISTICS, NO_QUERYSTORE;
GO

ALTER DATABASE [SuperApp-perf] SET READ_WRITE WITH ROLLBACK IMMEDIATE;
ALTER DATABASE [SuperApp-perf] SET RECOVERY SIMPLE;
GO

USE [SuperApp-perf];
GO

-- Index có trên prod nhưng không có trên dev (định nghĩa lấy từ SuperApp-pro, 2026-10-05).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('pro.task') AND name = 'ix_task_project_id')
    CREATE INDEX ix_task_project_id ON pro.task (project_id) WHERE deleted_at IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('pro.task') AND name = 'ix_task_parent_task_id')
    CREATE INDEX ix_task_parent_task_id ON pro.task (parent_task_id) WHERE deleted_at IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('pro.task') AND name = 'ix_task_start_end_date')
    CREATE INDEX ix_task_start_end_date ON pro.task (start_date, end_date) WHERE deleted_at IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('pro.task') AND name = 'ix_task_status')
    CREATE INDEX ix_task_status ON pro.task (status_code) WHERE deleted_at IS NULL;
GO

SELECT DB_NAME() AS db, DATABASEPROPERTYEX(DB_NAME(), 'Updateability') AS updateability,
       (SELECT COUNT(*) FROM sys.tables) AS tables,
       (SELECT COUNT(*) FROM urm.users) AS users;
