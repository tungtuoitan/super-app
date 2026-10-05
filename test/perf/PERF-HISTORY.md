# SuperApp BE — Performance History (project / task / comment)

**Fullpath:** /test/perf/PERF-HISTORY.md

Phân tích + đề xuất sau mỗi đợt đo (mới nhất ở trên). Số liệu thô từng run tự động ở [RUNS.md](RUNS.md) /
`runs/<id>/`; cách chạy: [README.md](README.md).

**Setup chuẩn:** BE perf trên VPS (`superapp-perf`, 127.0.0.1:5100, CPUQuota 1 core, 700 MB) · DB
`SuperApp-perf` seed mặc định (200 user, 8.000 project, 78.400 task, 392.000 comment; user nặng
perf+0001..0005 có 3.200 task) · restore DB + restart BE trước mỗi lượt · VPS 2 CPU / 3 GB dùng chung prod.

---

## 2026-10-05 (lần 2) — Đo lại có hồ sơ đầy đủ (`perf.mjs`), BE `037b557`

Số liệu chi tiết từng run: [RUNS.md](RUNS.md) (5 run: 2 baseline + 3 load, trước/sau thử nghiệm sửa).
Xác nhận lại kết luận lần 1 bằng counter SQL Server:

| 10 VU dồn tải, 1 phút | [chưa sửa](runs/20261005-222904-load/summary.md) | [RCSI ON + index parent](runs/20261005-223125-load/summary.md) |
|---|---|---|
| Throughput | 12.55 req/s | **31.2 req/s** (+149%) |
| p99 tất cả / p99 ghi | 9.687 / 11.234 ms | **2.324 / 542 ms** |
| Tổng thời gian chờ khoá (SQL, cả run) | **451.018 ms** (338 lần) | **63 ms** (6 lần) |
| Batch requests/s (SQL) | 30 | 74 |
| CPU avg: cả máy / BE perf / SQL | 43% / 44% / 30% | 73% / 85% / 43% (hết chờ khoá -> làm việc thật) |
| Prod (đo phía server) | 1.7 ms avg | 2.0 ms avg |

Baseline: DELETE 1 task p50 111 / 107 ms -> **36,5 / 35,8 ms** (normal / heavy).

**Phát hiện thêm về server** (từ `env.json` + counter, chưa có ở lần 1):
5. **SQL Server không giới hạn RAM** (`max server memory` = mặc định 2.147.483.647 MB) trên VPS 3,9 GB
   chạy chung BE prod: swap luôn dùng ~1,4–1,6 GB, **Page life expectancy chỉ ~176 s** (thấp — buffer
   pool bị đẩy ra liên tục). Nên đặt `max server memory` ~1,5–2 GB rồi đo lại.
6. **Song song hoá query trên máy 2 core**: wait top lúc baseline là `CXSYNC_PORT`/`CXPACKET`/`CXCONSUMER`
   (MAXDOP 0, `cost threshold for parallelism` = 5 mặc định). Nên nâng cost threshold (~50) rồi đo lại.

## 2026-10-05 (lần 1) — Đo đầu tiên, trước khi có hồ sơ run (task #1484), BE `037b557`

> Số dưới đây đo bằng script cũ (chưa lưu env/monitor/SQL counter vào `runs/`); để tham khảo.

### Baseline (tuần tự, chạy trên VPS, p50 / p95 ms)

| Endpoint | normal (320 task) | heavy (3.200 task) | Payload heavy |
|---|---|---|---|
| sàn (401 không token) | 2.7 / 7.1 | 1.1 / 3.1 | — |
| GET /api/project | 14.5 / 33.3 | 12.4 / 17.7 | 14 KB |
| GET /api/project/{id} | 9.9 / 12.6 | 7.9 / 10.6 | 0.5 KB |
| GET /api/task?projectIds={id}&deletedAt=null | 18.4 / 23.3 | 24.7 / 32.5 | 118 KB |
| GET /api/task?status=…&priority=… | 89.2 / 112.8 | **304 / 597** | **3.3 MB** |
| GET /api/task (toàn bộ) | 83.2 / 113.2 | **437 / 593** | **4.7 MB** |
| GET /api/task?deletedAt=null | 44.0 / 63.0 | 319 / 987 | 4.7 MB |
| GET /api/task/{id} | 13.1 / 15.8 | 9.8 / 12.7 | 1.3 KB |
| GET /api/task?searchText=… | 59.5 / 69.7 | 136 / 201 | 715 KB |
| GET /api/taskcomment?taskId= | 12.9 / 17.7 | 12.2 / 22.2 | 4 KB |
| POST /api/task | 31.2 / 43.5 | 28.2 / 42.6 | — |
| PATCH /api/task/{id} | 29.3 / 31.8 | 30.3 / 37.7 | — |
| POST /api/taskcomment | 21.8 / 27.1 | 17.7 / 22.0 | — |
| DELETE /api/task (1 task) | **113.7 / 145.0** | **114.7 / 191.8** | — |

### Load (k6 load-mixed, client qua SSH tunnel; sàn mạng ≈ 5 ms median)

| Lượt | Throughput | Lỗi | median / p95 / p99 (ms) | VPS host CPU | Prod (đo phía server) |
|---|---|---|---|---|---|
| 20 VU, nghỉ 1s, 2 phút | 17.3 req/s | 0% | 34 / 351 / 628 | 40% | 2.4 ms avg (trước: 1.5) |
| 10 VU, KHÔNG nghỉ, 1 phút | 16.2 req/s | 0% | 114 / 2.255 / **10.107** | 48% | 2.3 ms avg |
| 10 VU, không nghỉ, 40s (probe chẩn đoán) | 11.9 req/s | 0% | 121 / 2.404 / **14.523** | 45% | 2.5 ms avg |

→ Throughput **không tăng** khi bỏ thời gian nghỉ dù CPU còn dư: nghẽn KHOÁ, không phải CPU.
`db/sample-waits.sql` trong lúc probe: `LCK_M_S` 103 mẫu (max 13,8 s), `LCK_M_RS_U` 38 (DELETE),
`LCK_M_IX` 36 (UPDATE). Thủ phạm chặn nhiều nhất: SELECT list task (quét task user nặng, giữ khoá S);
DELETE pro.task giữ khoá range khi kiểm tra FK tự tham chiếu `parent_task_id`.

### Thử nghiệm sửa (chỉ trên SuperApp-perf): `db/experiments/rcsi-and-parent-index.sql`

READ_COMMITTED_SNAPSHOT ON + index KHÔNG filter `pro.task(parent_task_id)`:

| 10 VU không nghỉ, 40s | Trước | Sau |
|---|---|---|
| Throughput | 11.9 req/s | **31.4 req/s** |
| p99 tất cả | 14.523 ms | **1.969 ms** |
| DELETE /api/task p99 | 22.136 ms | **775 ms** |
| PATCH /api/task p99 | 14.384 ms | **503 ms** |
| GET /api/task?status&priority p99 | 15.339 ms | **2.489 ms** |
| Mẫu chờ khoá | 177 | **0** |
| Baseline DELETE 1 task p50 (normal / heavy) | 113.7 / 114.7 | **40.6 / 30.6** |

Sau khi sửa, giới hạn chuyển sang CPU BE perf (83% quota 1 core) — chủ yếu serialize JSON nhiều MB.

**Đề xuất (chưa áp prod — Tung quyết):**
1. Bật `READ_COMMITTED_SNAPSHOT` cho SuperApp-pro (prod đang OFF) — đọc/ghi không chặn nhau.
2. Index không filter `pro.task(parent_task_id)` (index hiện tại filter `deleted_at IS NULL` nên FK
   check khi xoá không dùng được).
3. List task trả toàn bộ `description`/`checklistJson`/… cho mọi task: 4,7 MB với user 3.200 task.
   Cân nhắc API list gọn (không kèm nội dung lớn) hoặc phân trang; FE gọi `status&priority` nên luôn
   kèm `deletedAt=null` (dùng được index filtered, nhanh gấp ~2 với user thường).
4. Dev thiếu 4 index `pro.task.ix_task_*` mà prod có -> thêm migration để dev giống prod.
