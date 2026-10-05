# Performance test — BE project / task / comment

**Fullpath:** /test/perf/README.md

Đo hiệu năng BE (repo `timeline`) cho các API chính project/task/comment (task #1484). Bổ sung cho
`../loadtest/` (mix đọc 4 endpoint) và `../test-workspace-api/` (tree/v2) — bộ này phủ phần **ghi**,
filter/search task, có **baseline từng endpoint**, và **lưu hồ sơ chi tiết mỗi lần đo** để so qua các lần
update. Bảng các run: [RUNS.md](RUNS.md) · phân tích + đề xuất: [PERF-HISTORY.md](PERF-HISTORY.md).

## Kiến trúc

```
máy nhà                                  VPS (2 CPU / 3 GB, DÙNG CHUNG PROD)
k6 (load) ──SSH tunnel :15100──────────▶ superapp-perf  127.0.0.1:5100  (unit systemd tạm,
                                           │            CPUQuota 1 core, MemoryMax 700M,
tools/baseline.mjs (scp, chạy trên VPS) ─▶ │            JWT key riêng)
                                           ▼
                                         SQL Server ── SuperApp-perf (data tổng hợp)
                                                    └─ SuperApp-pro (prod, KHÔNG đụng)
tools/vps-monitor.sh (trên VPS): CPU tức thời host/sqlservr/BE prod/BE perf + độ trễ prod phía server
```

- **DB `SuperApp-perf`**: schema clone từ SuperApp-dev (= code master) + 4 index `pro.task.ix_task_*`
  chỉ prod có; data TỔNG HỢP (không lấy data thật): 200 user `perf+NNNN@test.local` (password test
  `LoadTest@123`), 40 project/user, ~320 task/user (5 user nặng ~3.200), ~5 comment/task.
- Không dùng `SuperApp-test` cũ: snapshot 05/2026, lệch schema xa (chưa có `task.description`,
  `comment.type`, temporal table…).

## Chạy (từ thư mục này, Git Bash)

```bash
db/seed.sh                     # 1 lần (~1 phút): tạo SuperApp-perf + seed + backup .bak
be/deploy-perf-be.sh           # build origin/master (checkout sạch) -> chạy BE perf trên VPS
be/start-perf-be.sh            # các lần sau: bật lại BE perf đã deploy (CPU_QUOTA=200% … để thử quota khác)

node perf.mjs baseline --note "mô tả thay đổi"                       # baseline từng endpoint
node perf.mjs load VUS=20 DURATION=2m --note "mô tả thay đổi"        # load mix (THINK_MS=0 = dồn tải)
node perf.mjs load VUS=10 DURATION=1m THINK_MS=0 --apply db/experiments/x.sql --note "thử x"

node perf.mjs compare <runA> <runB> [lọc]   # chênh lệch từng số đo, vd lọc "workload." / "vps.during" / "sql."
node perf.mjs report                        # dựng lại RUNS.md (sau khi sửa perf.mjs)
be/stop-perf-be.sh                          # xong thì dừng BE perf
```

Mỗi lần `perf.mjs baseline|load` tự: restore DB về bản seed (`--no-restore` để bỏ) → áp `--apply` →
restart BE perf → chụp môi trường + counter SQL → giám sát VPS 15s trước / suốt run / 15s sau → lưu
**hồ sơ run** vào `runs/<id>/` và cập nhật [RUNS.md](RUNS.md). `--note` nên ghi rõ đang đo thay đổi gì.

## Hồ sơ mỗi run — `runs/<id>/` (commit vào git)

| File | Nội dung |
|---|---|
| `meta.json` | loại run, tham số, ghi chú, thử nghiệm DB đã áp, có restore không, mốc thời gian từng pha |
| `env.json` | **server**: CPU model/số core, RAM tổng/trống, swap, disk, OS/kernel, load, .NET runtime · **SQL Server**: version, edition, max server memory, target memory, MAXDOP, cost threshold · **BE perf**: build SHA, CPU/RAM quota · **BE prod**: thời điểm deploy · **DB**: RCSI, snapshot isolation, recovery, compat level, dung lượng, số dòng, danh sách index `pro.task` · RCSI của prod · **client**: máy, k6, node, commit bộ test |
| `monitor.csv` | mỗi 5s: load1, CPU cả máy, iowait, RAM trống, swap dùng, CPU + RSS của sqlservr / BE prod / BE perf, thread BE perf, độ trễ prod phía server |
| `sql-before.json` / `sql-after.json` | counter SQL Server cộng dồn: wait theo loại, batch/s, compile, lock wait/timeout/deadlock, page reads/writes, page life expectancy, full scan, version store, IO file của SuperApp-perf |
| `k6-summary.json` / `baseline.json` | kết quả thô |
| `metrics.json` | số đã chuẩn hoá: workload (req/s, lỗi, med/p95/p99/max tổng + đọc/ghi + waiting/receiving + từng endpoint, MB nhận), VPS theo pha (avg/min/max từng cột), delta SQL (chờ khoá, IO, CPU pressure, wait top, counter/s, IO file) |
| `summary.md` | bản đọc nhanh của tất cả các mục trên |

## An toàn

- VPS dùng chung prod: **quá 20 VU hoặc 2 phút thì hỏi Tung trước** và chọn giờ vắng. `perf.mjs`
  luôn ghi độ trễ prod (đo phía server) trước / trong / sau vào hồ sơ run để biết có ảnh hưởng không.
- BE perf có `Jwt__Key` riêng (token perf không dùng được trên prod), chỉ nghe 127.0.0.1, `.env`
  root:www-data 640, script tự huỷ nếu `.env` còn trỏ `SuperApp-pro`.
- Password `sa` không bao giờ rời VPS (`vps-sql.sh` đọc tại chỗ vào `SQLCMDPASSWORD`).
- Mọi script SQL tự kiểm tra tên DB (`SuperApp-perf`) trước khi ghi/xoá.

## Lưu ý đọc số

- **Baseline** = thời gian thuần server (chạy trên VPS, tuần tự). **k6** = phía client qua tunnel; dòng
  `GET floor (401)` là sàn mạng + pipeline để trừ ra (≈5 ms median, đuôi p95 tăng khi response lớn
  chiếm băng thông tunnel).
- BE perf bị giới hạn 1 core: throughput tuyệt đối thấp hơn prod (prod không giới hạn) — dùng để
  so SÁNH giữa các lần, không phải con số năng lực prod.
