---
name: superapp-test
description: >
  SuperApp-test database — frozen baseline với 1000 users + 3.087 triệu rows real data, dùng để load test BE.
  Trigger khi user: muốn load test SuperApp BE, restore test DB, chạy k6 với data thật, test capacity của
  /api/workspace/{id}/tree/v2 hoặc các endpoint khác, hỏi về toolkit ở loadtest/, test-workspace-api/, db-test/.
  Đọc skill này TRƯỚC KHI chạy load test để biết workflow chuẩn (restore → re-prewarm → k6) và tránh các gotcha
  (BE phải point qua test DB, JWT TTL, tokens hết hạn sau 15 phút).
---

# SuperApp-test — Frozen Test Database

## What it is

Database `SuperApp-test` ở `157.66.101.51:1433`, snapshot tại 2026-05-24 với **1000 loadtest users + ~3.087 triệu rows** clone từ user `hoanhtungle@gmail.com` (id=1) trên `SuperApp-pro`.

**Mục đích:** restore từ `.bak` (~24s) thay vì phải seed + clone lại (~18 phút) mỗi lần load test.

Backup file: `/var/opt/mssql/data/SuperApp-test.bak` (~30MB compressed) trên VPS Linux SQL Server.

## Data shape per loadtest user

| Table | Per user | Total ×1000 |
|-------|----------|-------------|
| ws.workspaces | 20 | 20,000 |
| ws.workspace_items | 336 | 336,000 |
| ws.folders | 217 | 217,000 |
| dbo.notes | 363 | 363,000 |
| dbo.files | 112 | 112,000 |
| dbo.Keywords | 977 | 977,000 |
| dbo.hashtags | 2 | 2,000 |
| pro.project | 22 | 22,000 |
| pro.task | 86 | 86,000 |
| pro.task_comment | 596 | 596,000 |
| k.knowledge | 2 | 2,000 |
| k.node | 42 | 42,000 |
| k.question | 311 | 311,000 |
| urm.user_profiles | 1 | 1,000 |

User pattern: `loadtest+0001@test.local` … `loadtest+1000@test.local`, password chung `LoadTest@123` (bcrypt rounds=11).

## Toolkit layout

```
SuperApp/test/                      # ⭐ Tất cả load test toolkit nằm trong đây
├── loadtest/                       # Endpoint mix scenarios
│   ├── seed-users.js               # bcrypt seed 1000 users
│   ├── prewarm-tokens.js           # login N users, save tokens.json (concurrency=8 with 429 retry)
│   ├── cleanup-users.js
│   ├── run.ps1                     # -Seed -Prewarm -NoAuth -Cleanup -Vus N -RampUp/Steady/RampDown
│   ├── bin/k6.exe                  # portable k6 v2.0.0
│   ├── k6/scenario.js              # full flow: login + 5 endpoints
│   ├── k6/scenario-noauth.js       # uses prewarmed tokens
│   └── .env                        # DB creds (DB_PASSWORD), VUS, etc.
│
├── test-workspace-api/             # /api/workspace/{id}/tree/v2 stress (real data)
│   ├── BENCHMARK-HISTORY.md        # ⭐ Lưu kết quả qua các lần BE thay đổi
│   ├── clone-data.js               # legacy per-user clone (slow ~18min); use db-test/ instead
│   ├── cleanup-data.js
│   ├── run.ps1                     # -Full -Clone -Cleanup
│   ├── k6/scenario-tree.js         # gradual ramp (1m), random ws per VU
│   ├── k6/scenario-spike.js        # 30s burst — random ws (worst case for cache)
│   └── k6/scenario-spike-sticky.js # 30s burst — mỗi VU dính 1 ws (realistic, cache-friendly)
│
└── db-test/                        # Test DB lifecycle
    ├── scripts/clone-schema.js     # DBCC CLONEDATABASE SuperApp-dev -> SuperApp-test
    ├── scripts/clone-all.js        # ⭐ Pure-SQL bulk clone (~18min for full data)
    ├── scripts/backup.js           # BACKUP DATABASE -> /var/opt/mssql/data/SuperApp-test.bak
    ├── scripts/restore.js          # RESTORE WITH REPLACE (~24s)
    ├── setup.ps1                   # one-time: clone-schema + seed-users + clone-all + backup
    └── restore.ps1                 # restore baseline (use before each test sweep)
```

## Workflow chuẩn cho mỗi lần load test

### 1. Restore baseline (~24s)
```powershell
cd C:\Users\Admin\source\SuperApp\test\db-test
.\restore.ps1
```

### 2. Point BE qua test DB

**Lưu ý quan trọng:** BE dùng `DotNetEnv` để load `Timeline\.env` — env vars set qua `$env:...` BỊ ghi đè bởi `.env`. Có 2 cách:

**Cách A (recommend): tạm swap `Timeline\.env`**
```powershell
$envPath = "C:\Users\Admin\source\Timeline\.env"
Copy-Item $envPath "$envPath.backup-before-loadtest" -Force
(Get-Content $envPath) -replace "Database=SuperApp-dev","Database=SuperApp-test" | Set-Content $envPath
# ... chạy test ...
# restore lại sau:
Copy-Item "$envPath.backup-before-loadtest" $envPath -Force
Remove-Item "$envPath.backup-before-loadtest"
```

**Cách B: sửa Program.cs để env vars override `.env`** — chuẩn hơn nhưng cần edit BE code, chỉ làm khi cần test thường xuyên.

Sau khi swap `.env`, restart BE:
```powershell
# Stop BE cũ nếu đang chạy:
Get-Process | Where-Object { $_.Path -like "*SuperAppAPI*" } | Stop-Process -Force

# Start mới:
cd C:\Users\Admin\source\Timeline\SuperAppAPI
dotnet run --no-launch-profile --urls=http://localhost:5000
```
Đợi `Now listening on: http://localhost:5000`.

### 3. Re-prewarm tokens (~100s, BẮT BUỘC mỗi lần restore)
```powershell
cd C:\Users\Admin\source\SuperApp\test\loadtest
$env:PREWARM_CONCURRENCY = "8"
node prewarm-tokens.js
```
JWT trong tokens.json tham chiếu user trong DB. Restore tạo lại user nên cần re-prewarm.

Copy tokens vào test/test-workspace-api nếu test tree:
```powershell
copy C:\Users\Admin\source\SuperApp\test\loadtest\results\tokens.json C:\Users\Admin\source\SuperApp\test\test-workspace-api\results\tokens.json
```

### 4. Chạy k6
```powershell
# Endpoint mix
cd C:\Users\Admin\source\SuperApp\test\loadtest
.\bin\k6.exe run -e BASE_URL=http://localhost:5000 -e VUS=200 -e RAMP_UP=30s -e STEADY=1m -e RAMP_DOWN=15s k6\scenario-noauth.js

# Tree/v2 gradual ramp (real data)
cd C:\Users\Admin\source\SuperApp\test\test-workspace-api
& "C:\Users\Admin\source\SuperApp\test\loadtest\bin\k6.exe" run -e BASE_URL=http://localhost:5000 -e VUS=1000 -e RAMP_UP=1m -e STEADY=2m -e RAMP_DOWN=30s k6\scenario-tree.js

# Tree/v2 spike (1000 users mở app cùng lúc, 30s burst, random ws — worst case cache)
& "C:\Users\Admin\source\SuperApp\test\loadtest\bin\k6.exe" run -e BASE_URL=http://localhost:5000 -e VUS=1000 -e RAMP_UP=30s -e STEADY=1m -e RAMP_DOWN=15s k6\scenario-spike.js

# Tree/v2 spike STICKY (mỗi VU dính 1 ws — realistic + cache-friendly, đo cache benefit)
& "C:\Users\Admin\source\SuperApp\test\loadtest\bin\k6.exe" run -e BASE_URL=http://localhost:5000 -e VUS=1000 -e RAMP_UP=30s -e STEADY=1m -e RAMP_DOWN=15s k6\scenario-spike-sticky.js
```

Sau mỗi spike/tree run, append entry vào `test/test-workspace-api/BENCHMARK-HISTORY.md` với BE config + kết quả để so sánh với run trước.

## Khi nào re-build .bak

Chạy lại `db-test\setup.ps1` khi:
- Schema BE đổi (migration mới merge vào master)
- User `hoanhtungle@gmail.com` trên prod có data shape thay đổi đáng kể và muốn baseline mới

```powershell
cd C:\Users\Admin\source\SuperApp\test\db-test
.\setup.ps1                          # full rebuild + backup (~18 min)
.\setup.ps1 -SkipUsers               # data only (users đã seed)
.\setup.ps1 -SkipUsers -SkipData     # backup only
```

## Baseline numbers (2026-05-24, single laptop, BE local)

| Test | VUs | Throughput | p95 | Notes |
|------|-----|-----------|-----|-------|
| Light reads no-auth | 1000 | 735 req/s | <100ms | empty-data, không có bcrypt |
| Endpoint mix có login | 100 | 63 req/s | 1.7s | login = bottleneck |
| Endpoint mix có login | 1000 | 31 req/s | 60s | thrash, 30% login fail |
| **tree/v2 real data** | 200 | 24 req/s | 19s | **0% fail**, queue holds |
| **tree/v2 real data** | 1000 | 26 req/s | 60s timeout | 20% fail, hard ceiling |

Tree/v2 nặng **28×** vs light reads. Avg payload 600KB. Với data thật, throughput cap ~25 req/s sustained.

## Gotchas (thật)

- **JWT TTL phải đủ dài.** Default `Jwt__ExpirationMinutes=15` trong `Timeline\.env`. Test dài hơn 15 phút (counting prewarm + ramp + steady) sẽ thấy 401 random — bump TTL hoặc rút test ngắn lại.
- **Restore kicks BE EF connections.** Sau restore, restart `dotnet run` để pool sạch. Skip thì BE sẽ trả 401/500 do connection bám vào DB cũ.
- **Tokens.json hết hạn sau 15 phút.** Mỗi restore + mỗi run mới phải re-prewarm. Không cache lâu hơn.
- **k6 v2 `open()` resolves relative to cwd.** `scenario-tree.js` mở `../results/tokens.json` (relative to `test-workspace-api/`), nên phải copy tokens vào `test-workspace-api/results/` trước khi chạy.
- **Disk VPS hẹp (49GB total).** Bulk DML trong FULL recovery mode làm log phình lên 5GB+ và ăn hết disk → backup fail. `backup.js` đã auto switch SIMPLE recovery + `DBCC SHRINKFILE` trước khi BACKUP. Đừng quay lại FULL recovery cho `SuperApp-test` (nó là test DB, không cần PITR).
- **dbo.Keywords có UNIQUE(Link).** Clone script append `#u<userId>` vào Link để tránh collision — đừng đổi pattern email/userId nếu không update logic clone.
- **Connection pool size = 1 trong clone-all.js.** Bắt buộc vì script dùng staging tables (`dbo._stage_*`) liên kết qua nhiều requests; pool >1 sẽ làm staging tables không thấy được. Đừng tăng pool size.
- **BE đang dùng connection string từ `Timeline\.env`.** Override bằng `$env:ConnectionStrings__SuperAppConnection` trước khi `dotnet run` — KHÔNG sửa file `.env` (sẽ ảnh hưởng dev workflow).
- **Skipped tables (chấp nhận):** flow_edge, flow_node_position, point_history, node_status_history, entity_hashtags, refresh_tokens. Lý do: loose refs / không relevant cho load test.

## Memory references

Xem thêm `loadtest-baseline-2026-05-24.md` trong project memory cho chi tiết tuning đã apply trên `Timeline\` (rate-limit login, thread pool, EF pool).

## Connection info

- Host: `157.66.101.51:1433`
- DB: `SuperApp-test`
- User: `sa`, password trong `loadtest\.env` (`DB_PASSWORD`)
- Backup path: `/var/opt/mssql/data/SuperApp-test.bak` (trên Linux SQL Server host)
