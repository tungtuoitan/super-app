# SuperApp BE Benchmark History

Lưu lại kết quả load test qua các lần BE thay đổi. Mục tiêu: thấy tác động của từng tuning lên throughput, latency, fail rate.

**Test setup chuẩn:**
- DB: `SuperApp-test` (restore từ `/var/opt/mssql/data/SuperApp-test.bak`)
- 1000 users, ~3.087 triệu rows clone từ `hoanhtungle@gmail.com` trên prod
- BE: local `dotnet run` trên máy load test
- k6 v2.0.0 portable
- Reset giữa các run: `test\db-test\restore.ps1` + restart BE

**Workflow trước mỗi run mới:**
1. `cd test\db-test; .\restore.ps1`
2. Tạm swap `Database=SuperApp-dev` → `SuperApp-test` trong `Timeline\.env` rồi restart BE (DotNetEnv ghi đè env vars set qua `$env:...`)
3. `cd test\loadtest; node prewarm-tokens.js`
4. Copy tokens: `copy test\loadtest\results\tokens.json test\test-workspace-api\results\tokens.json`
5. Chạy scenario tương ứng

---

## Template entry

```markdown
### YYYY-MM-DD — <Tóm tắt thay đổi BE>

**BE tuning áp dụng:**
- Bullet 1
- Bullet 2

**BE config snapshot:**
- ThreadPool min: X / X
- EF Pool max: Y, min: Z
- Rate limit login: 10 req/s/IP
- JWT TTL: 15 min
- Bcrypt rounds: 11
- Other: ...

**Hardware:**
- BE host: <CPU model, RAM, OS>
- DB host: 157.66.101.51 (VPS, 49GB disk)

**Results:**

| Scenario | VUs | Throughput | p95 | p99 | Fail | Notes |
|----------|-----|-----------|-----|-----|------|-------|
| scenario-noauth (light reads) | 1000 | X req/s | Xms | Xms | X% | |
| scenario-tree (gradual ramp) | 1000 | X req/s | Xms | Xms | X% | |
| scenario-spike (30s ramp) | 1000 | X req/s | Xms | Xms | X% | |

**Insight:** 1-3 sentences về cái gì improved hoặc regress so với lần trước.

**Files:**
- `test/loadtest/results/summary-noauth-<ts>.json`
- `test/test-workspace-api/results/summary-tree-<ts>.json`
- `test/test-workspace-api/results/summary-spike-<ts>.json`
```

---

## History

### 2026-05-24 — Initial baseline

**BE tuning áp dụng:**
- Rate-limit login (10 req/s/IP, `[EnableRateLimiting("login")]`)
- ThreadPool.SetMinThreads(200, 200) in Program.cs
- EF Core: `Pooling=true;Max Pool Size=200;Min Pool Size=20`
- Skipped: JWT cache (no DB lookup in middleware), response cache (user-scoped data)

**BE config snapshot:**
- ThreadPool min: 200 / 200
- EF Pool max: 200, min: 20
- Rate limit login: 10 req/s/IP
- JWT TTL: 15 min (was 1 min — hot fix during session)
- Bcrypt rounds: 11
- Logging: Serilog daily rolling

**Hardware:**
- BE host: local laptop (Windows 11, single dotnet run)
- DB host: 157.66.101.51 (VPS, Linux SQL Server 2022, 49GB disk)

**Data state:**
- Empty DB (no cloned data) for noauth test
- 333k workspace items only for first tree test (workspace_items + workspaces only)
- Full 3.087M rows for tree test #2 and onward

**Results:**

| Scenario | VUs | Data | Throughput | p95 | Fail | Notes |
|----------|-----|------|-----------|-----|------|-------|
| Light reads no-auth | 1000 | empty | 735 req/s | <100ms | <1% | bcrypt skipped, BE ceiling |
| Endpoint mix + login | 100 | empty | 63 req/s | 1.7s | 0% login | bcrypt = bottleneck |
| Endpoint mix + login | 1000 | empty | 31 req/s | 60s timeout | 30% login | thrash |
| scenario-tree (1m ramp) | 200 | full prod | 24 req/s | 19s | 0% | queue holds |
| scenario-tree (1m ramp) | 1000 | full prod | 26 req/s | 60s timeout | 20% | hard ceiling |

**Insight:**
- bcrypt rounds=11 dominates BE CPU at login (~100ms each). 1000 VUs login simultaneously thrashes thread pool.
- `tree/v2` is **28× heavier** than light reads. Avg payload 600KB. Sustained ceiling ~25 req/s on this hardware with full prod data.
- BE fails slow (queue + 60s timeout) instead of crashing — acceptable for staging, ugly UX. Client-side timeout < 60s + skeleton UI recommended.
- Empty-DB tests are deceptively fast — they exercise routing + JWT + EF connection but skip the actual workload. Always seed real-shaped data.

**Files (preserved):**
- `test/loadtest/results/summary-2026-05-24T02-30-08-097Z.json` (1000 VU full flow)
- `test/test-workspace-api/results/summary-tree-2026-05-24T08-39-52-171Z.json` (1000 VU tree, full data)
- `test/test-workspace-api/results/summary-spike-2026-05-24T10-41-11-574Z.json` (1000 VU spike, full data)

---

### 2026-05-24 — Spike scenario added (1000 users in 30s burst)

**Mục đích:** mô phỏng "1000 user mở app cùng lúc" (notification fan-out, sau deploy, sau meeting). Khác `scenario-tree.js` ở ramp-up: 30s thay vì 1 phút.

**BE config:** giống baseline ở trên (ThreadPool 200/200, EF pool 200/20, rate-limit login, BCrypt rounds=11).

**Data:** `SuperApp-test` restore từ `.bak` (1000 users + 3.087M rows real prod data).

**Test config:**
- VUs: 1000
- Ramp-up: 30s (aggressive)
- Steady: 1m
- Ramp-down: 15s
- Tokens: prewarmed (981/1000 success, 19 fail do rate-limit login race)

**Results:**

| Metric | Value |
|--------|-------|
| Duration | 135s |
| Total requests | 3418 @ 25 req/s |
| Iterations | 2403 |
| Overall fail | 14.37% |
| tree/v2 p95 | 60000ms (timeout) |
| tree/v2 p99 | 60001ms (timeout) |
| tree/v2 avg | 31555ms |
| tree/v2 max | 60034ms |
| tree/v2 avg payload | 202 KB |

**So sánh với gradual ramp (1m, cùng 1000 VUs):**

| Metric | Gradual (1m ramp) | Spike (30s ramp) | Δ |
|--------|-------------------|------------------|---|
| Throughput | 26 req/s | 25 req/s | ~equal |
| p95 | 60s timeout | 60s timeout | equal |
| Fail rate | 19.6% | 14.4% | spike slightly better |
| Iterations | 5137 (in 240s) | 2403 (in 135s) | proportional |

**Insight:**
- BE behavior ở spike và gradual gần như giống nhau ở 1000 VUs — đã chạm hard ceiling, ramp speed không quan trọng nữa
- Throughput cap **~25 req/s** sustained cho `tree/v2` với prod-scale data, bất kể tốc độ ramp
- **Avg payload 202KB** (giảm từ 600KB ở gradual run) — random ws picker rơi vào nhiều ws nhỏ hơn run trước, do ws thật có 32 cái với size phân bố không đều
- Bottleneck KHÔNG phải connection limit (Kestrel chấp nhận hết 1000 conn) mà là **DB query + serialization throughput**
- Realistic capacity: **1 BE instance = ~25 user concurrent active xem tree**. Để hỗ trợ 1000 user mở app cùng lúc cần: paginate tree, hoặc cache tree response, hoặc scale horizontal.

**Files:**
- `test/test-workspace-api/results/summary-spike-2026-05-24T10-41-11-574Z.json`
- `test/test-workspace-api/results/k6-spike-1000.log`
