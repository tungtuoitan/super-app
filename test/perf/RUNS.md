# Lịch sử các lần đo

**Fullpath:** /test/perf/RUNS.md

> SINH TỰ ĐỘNG bởi `node perf.mjs` (mỗi run / `report`) — không sửa tay. Chi tiết từng run: `runs/<id>/summary.md`.
> So sánh 2 run: `node perf.mjs compare <A> <B>`. Phân tích + đề xuất: [PERF-HISTORY.md](PERF-HISTORY.md).

## Load

| Run | Ghi chú | BE | RCSI | Thử nghiệm DB | Tham số | req/s | lỗi % | med | p95 | p99 | ghi p99 | host CPU avg/max | perf BE CPU avg/max | SQL CPU avg | RAM trống min | swap max | prod ms avg/max | chờ khoá ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [20261005-222532-load](runs/20261005-222532-load/summary.md) | load nhẹ 20 VU, chưa sửa (RCSI OFF) | 037b557 | OFF | — | VUS=20 DURATION=2m RAMP=20s THINK_MS=1000 | 14.35 | 0 | 35.4 | 468.1 | 10874.5 | 14220.8 | 38.8 / 60 | 37.4 / 83 | 28.2 | 1995 | 1528 | 2 / 7.8 | 481608 |
| [20261005-222904-load](runs/20261005-222904-load/summary.md) | dồn tải 10 VU, chưa sửa (RCSI OFF) | 037b557 | OFF | — | VUS=10 DURATION=1m RAMP=10s THINK_MS=0 | 12.55 | 0 | 141.8 | 3492.7 | 9687.4 | 11234.3 | 43.3 / 85 | 43.7 / 90 | 30.3 | 2048 | 1398 | 1.7 / 4.6 | 451018 |
| [20261005-223125-load](runs/20261005-223125-load/summary.md) | dồn tải 10 VU, thử RCSI ON + index parent_task_id | 037b557 | ON | rcsi-and-parent-index | VUS=10 DURATION=1m RAMP=10s THINK_MS=0 | 31.2 | 0 | 147.3 | 718.7 | 2323.6 | 542.1 | 72.8 / 90 | 84.6 / 98 | 42.8 | 2035 | 1394 | 2 / 5.9 | 63 |

## Baseline (p50 ms — normal / heavy)

| Run | Ghi chú | BE | RCSI | Thử nghiệm DB | GET /api/task (toàn bộ task của user) | GET /api/task?status=open,in_progress,...&priority=... | GET /api/task?projectIds={id}&deletedAt=null | PATCH /api/task/{id} (status) | DELETE /api/task (xoá vĩnh viễn 1 task) | host CPU avg/max | chờ khoá ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [20261005-222252-baseline](runs/20261005-222252-baseline/summary.md) | baseline chuẩn, chưa sửa (RCSI OFF) | 037b557 | OFF | — | 91.1 / 440.8 | 77.7 / 295 | 15.6 / 21.4 | 34.6 / 26.7 | 111.2 / 107.1 | 61.9 / 87 | 388 |
| [20261005-223340-baseline](runs/20261005-223340-baseline/summary.md) | baseline, thử RCSI ON + index parent_task_id | 037b557 | ON | rcsi-and-parent-index | 74 / 454.1 | 79.1 / 302.7 | 17.6 / 22.3 | 27.4 / 31.4 | 36.5 / 35.8 | 62.6 / 76 | 55 |
