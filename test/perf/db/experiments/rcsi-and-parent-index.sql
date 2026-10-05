/*
**Fullpath:** /test/perf/db/experiments/rcsi-and-parent-index.sql

Thử nghiệm 2026-10-05 (task #1484) — áp lên SuperApp-perf SAU khi restore để so với lượt không sửa:
  1. READ_COMMITTED_SNAPSHOT ON: SELECT đọc phiên bản đã commit thay vì xin khoá S -> đọc và ghi
     không chặn nhau (prod hiện OFF).
  2. Index KHÔNG filter trên pro.task(parent_task_id): FK tự tham chiếu FK_task_parent... khi DELETE
     phải kiểm tra "còn task con không" — index filtered (deleted_at IS NULL) không dùng được cho
     việc này nên SQL quét cả bảng với khoá range (LCK_M_RS_U).
Chạy: ./vps-sql.sh db/experiments/rcsi-and-parent-index.sql master
*/
SET NOCOUNT ON;
ALTER DATABASE [SuperApp-perf] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE [SuperApp-perf];
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('pro.task') AND name = 'ix_task_parent_task_id_all')
    CREATE INDEX ix_task_parent_task_id_all ON pro.task (parent_task_id);
GO
SELECT name, is_read_committed_snapshot_on AS rcsi FROM sys.databases WHERE name = N'SuperApp-perf';
