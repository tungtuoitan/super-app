/*
**Fullpath:** /test/perf/db/02-seed-perf-data.sql

Seed data TỔNG HỢP (nội dung giả, không lấy từ prod) vào SuperApp-perf. Set-based, vài chục giây.

Quy mô mặc định mô phỏng "nhiều user cỡ Tung": user thật trên prod (2026-10-05) có 40 project,
283 task, 1393 comment (~5 comment/task). Thêm vài user "nặng" gấp HEAVY_FACTOR lần số task.

Tham số (sqlcmd -v, truyền qua ./vps-sql.sh ... NAME=VALUE):
  USERS               số user perf+NNNN@test.local          (mặc định trong seed.sh: 200)
  PROJECTS_PER_USER   project / user                         (40)
  TASKS_PER_PROJECT   task / project với user thường         (8  -> ~320 task/user)
  COMMENTS_PER_TASK   comment trung bình / task              (5)
  HEAVY_USERS         số user nặng (perf+0001..)             (5)
  HEAVY_FACTOR        user nặng có gấp N lần task            (10 -> ~3200 task/user)
  PWHASH              bcrypt hash của password test (seed.sh tự sinh, không commit)

Phân bố: status open/in_progress/completed/paused/background_progress/dropped, priority
low/medium/high, ~20% task là task con, ~1/3 có checklist, 4% milestone, comment đủ 4 loại.
Workspace KHÔNG seed (project.workspace_id = NULL) — các API được đo không cần workspace.

Chỉ chạy được trên SuperApp-perf.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @db sysname = DB_NAME();
IF @db <> N'SuperApp-perf'
BEGIN
    RAISERROR(N'Chỉ seed vào SuperApp-perf (đang ở %s).', 16, 1, @db);
    RETURN;
END

IF EXISTS (SELECT 1 FROM urm.users WHERE email LIKE N'perf+%@test.local')
BEGIN
    RAISERROR(N'SuperApp-perf đã có data perf — tạo lại DB bằng 01-create-perf-db.sql trước khi seed.', 16, 1);
    RETURN;
END

DECLARE @users int = $(USERS), @projects int = $(PROJECTS_PER_USER), @tasks int = $(TASKS_PER_PROJECT),
        @comments int = $(COMMENTS_PER_TASK), @heavyUsers int = $(HEAVY_USERS), @heavyFactor int = $(HEAVY_FACTOR);
DECLARE @t0 datetime2 = SYSUTCDATETIME();

-- Bảng số 1..N dùng để nhân dòng.
CREATE TABLE #n (n int PRIMARY KEY);
INSERT #n SELECT TOP (10000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) FROM sys.all_objects a CROSS JOIN sys.all_objects b;

-- Users
INSERT urm.users (email, password, auth_type, is_active, created_at)
SELECT CONCAT(N'perf+', RIGHT(CONCAT('0000', n), 4), N'@test.local'), N'$(PWHASH)', N'local', 1, SYSUTCDATETIME()
FROM #n WHERE n <= @users;

CREATE TABLE #u (id int PRIMARY KEY, rnk int NOT NULL);
INSERT #u SELECT id, ROW_NUMBER() OVER (ORDER BY email) FROM urm.users WHERE email LIKE N'perf+%@test.local';

-- Projects
INSERT pro.project (name, description, status_code, user_id, start_date, end_date, created_at, updated_at)
SELECT CONCAT(N'Perf project ', u.rnk, N'-', p.n),
       N'<p>Dự án tổng hợp phục vụ performance test — nội dung giả.</p>',
       CASE p.n % 8 WHEN 0 THEN N'completed' WHEN 1 THEN N'paused' WHEN 2 THEN N'open' WHEN 3 THEN N'planned' ELSE N'active' END,
       u.id,
       DATEADD(day, -3 * p.n, '2026-10-01'), DATEADD(day, 90 - p.n, '2026-10-01'),
       DATEADD(minute, p.n, '2026-01-01'), DATEADD(minute, p.n, '2026-01-01')
FROM #u u JOIN #n p ON p.n <= @projects;

-- Tasks
INSERT pro.task (project_id, type, title, description, status_code, priority, start_date, end_date, order_index,
                 task_type, checklist_json, is_milestone, created_at, updated_at)
SELECT p.id,
       CASE WHEN t.n % 25 = 0 THEN N'milestone' WHEN t.n % 7 = 0 THEN N'repeat' ELSE N'task' END,
       CONCAT(N'Perf task ', p.id, N'-', t.n, N' — việc cần làm số ', t.n),
       REPLICATE(CAST(N'<p>Nội dung mô tả task tổng hợp để payload có kích thước gần thật.</p>' AS nvarchar(max)), 1 + t.n % 8),
       CASE t.n % 10 WHEN 0 THEN N'completed' WHEN 1 THEN N'completed' WHEN 2 THEN N'in_progress' WHEN 3 THEN N'paused'
                     WHEN 4 THEN N'background_progress' WHEN 5 THEN N'dropped' ELSE N'open' END,
       CASE t.n % 3 WHEN 0 THEN N'high' WHEN 1 THEN N'medium' ELSE N'low' END,
       DATEADD(day, t.n % 60 - 30, '2026-10-05'), DATEADD(day, t.n % 60 - 30 + t.n % 10, '2026-10-05'),
       t.n, N'personal',
       CASE WHEN t.n % 3 = 0 THEN N'{"items":[{"id":"c1","text":"bước 1","checked":true},{"id":"c2","text":"bước 2","checked":false},{"id":"c3","text":"bước 3","checked":false}]}' END,
       CASE WHEN t.n % 25 = 0 THEN 1 ELSE 0 END,
       DATEADD(minute, t.n, p.created_at), DATEADD(minute, t.n, p.created_at)
FROM pro.project p
JOIN #u u ON u.id = p.user_id
JOIN #n t ON t.n <= @tasks * CASE WHEN u.rnk <= @heavyUsers THEN @heavyFactor ELSE 1 END;

-- ~20% là task con: task thứ 5k trong project -> cha là task ngay trước nó.
;WITH r AS (SELECT id, project_id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) AS rn FROM pro.task)
UPDATE tc SET parent_task_id = par.id
FROM pro.task tc
JOIN r c ON c.id = tc.id
JOIN r par ON par.project_id = c.project_id AND par.rn = c.rn - 1
WHERE c.rn % 5 = 0;

-- Comments: 0..2*avg comment / task (trung bình ~COMMENTS_PER_TASK), đủ 4 loại.
INSERT pro.task_comment (task_id, content, user_id, type, occurred_at, created_at, updated_at)
SELECT t.id,
       REPLICATE(CAST(N'Ghi chú tổng hợp cho performance test. ' AS nvarchar(max)), 1 + c.n % 6),
       p.user_id,
       CASE c.n % 4 WHEN 0 THEN N'devlog' WHEN 1 THEN N'comment' WHEN 2 THEN N'decision' ELSE N'track' END,
       CASE WHEN c.n % 4 = 0 THEN DATEADD(hour, -c.n, '2026-10-01') END,
       DATEADD(minute, c.n, t.created_at), DATEADD(minute, c.n, t.created_at)
FROM pro.task t
JOIN pro.project p ON p.id = t.project_id
JOIN #n c ON c.n <= t.id % (2 * @comments + 1);

UPDATE STATISTICS pro.project WITH FULLSCAN;
UPDATE STATISTICS pro.task WITH FULLSCAN;
UPDATE STATISTICS pro.task_comment WITH FULLSCAN;

SELECT (SELECT COUNT(*) FROM #u) AS users,
       (SELECT COUNT(*) FROM pro.project) AS projects,
       (SELECT COUNT(*) FROM pro.task) AS tasks,
       (SELECT COUNT(*) FROM pro.task WHERE parent_task_id IS NOT NULL) AS subtasks,
       (SELECT COUNT(*) FROM pro.task_comment) AS comments,
       DATEDIFF(second, @t0, SYSUTCDATETIME()) AS seconds;

SELECT TOP 3 u.rnk, COUNT(DISTINCT p.id) AS projects, COUNT(t.id) AS tasks
FROM #u u JOIN pro.project p ON p.user_id = u.id LEFT JOIN pro.task t ON t.project_id = p.id
GROUP BY u.rnk ORDER BY u.rnk;

SELECT name, temporal_type_desc FROM sys.tables WHERE schema_id = SCHEMA_ID('pro') AND name IN ('project', 'task', 'task_comment');

EXEC sp_spaceused;
