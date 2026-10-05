/*
**Fullpath:** /test/perf/db/sample-waits.sql

Chẩn đoán lúc load: lấy mẫu mỗi giây các request đang chạy trên SuperApp-perf trong $(SECONDS) giây,
rồi tổng hợp đang chờ gì (LCK_* = chờ khoá, PAGEIOLATCH = chờ đọc đĩa, ASYNC_NETWORK_IO = chờ client
đọc response, SOS_SCHEDULER_YIELD = CPU...) và câu lệnh nào chặn nhiều nhất.
Chạy song song với k6:  ./vps-sql.sh db/sample-waits.sql master SECONDS=45
*/
SET NOCOUNT ON;
CREATE TABLE #w (ts datetime2, session_id int, blocking int, wait_type nvarchar(60), wait_ms int, cmd nvarchar(32), stmt nvarchar(200));
DECLARE @until datetime2 = DATEADD(second, $(SECONDS), SYSUTCDATETIME());
WHILE SYSUTCDATETIME() < @until
BEGIN
    INSERT #w
    SELECT SYSUTCDATETIME(), r.session_id, r.blocking_session_id, ISNULL(r.wait_type, N'(running)'), r.wait_time, r.command,
           LEFT(REPLACE(REPLACE(SUBSTRING(t.text, r.statement_start_offset / 2 + 1,
                CASE WHEN r.statement_end_offset = -1 THEN 4000 ELSE (r.statement_end_offset - r.statement_start_offset) / 2 + 1 END),
                CHAR(10), ' '), CHAR(13), ' '), 200)
    FROM sys.dm_exec_requests r CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
    WHERE r.database_id = DB_ID(N'SuperApp-perf') AND r.session_id <> @@SPID;
    WAITFOR DELAY '00:00:01';
END

SELECT wait_type, COUNT(*) AS samples, MAX(wait_ms) AS max_wait_ms
FROM #w GROUP BY wait_type ORDER BY samples DESC;

SELECT TOP 8 cmd, COUNT(*) AS samples_waiting_on_lock, MAX(wait_ms) AS max_wait_ms, MIN(stmt) AS stmt
FROM #w WHERE wait_type LIKE N'LCK%' GROUP BY cmd, LEFT(stmt, 80) ORDER BY samples_waiting_on_lock DESC;

SELECT TOP 8 b.cmd AS blocker_cmd, b.wait_type AS blocker_state, COUNT(*) AS times_blocking, MIN(b.stmt) AS blocker_stmt
FROM #w w JOIN #w b ON b.session_id = w.blocking AND b.ts = w.ts
WHERE w.blocking <> 0
GROUP BY b.cmd, b.wait_type, LEFT(b.stmt, 80) ORDER BY times_blocking DESC;
