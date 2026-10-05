# Run 20261005-222252-baseline

- Loại: **baseline** · ghi chú: baseline chuẩn, chưa sửa (RCSI OFF)
- Tham số: `{"REPS":30}` · BE build `037b557` · thử nghiệm DB: không
- DB: RCSI OFF · 78400 task · index pro.task: ix_task_parent_task_id (filtered), ix_task_project_id (filtered), ix_task_start_end_date (filtered), ix_task_status (filtered), pk_task
- Server: Intel(R) Xeon(R) Platinum 8272CL CPU @ 2.60GHz × 2 core · RAM 3912 MB (trống lúc bắt đầu 2524 MB, swap dùng 1617 MB, load 1.66) · SQL Server 16.0.4225.2 (max memory 2147483647 MB) · BE perf quota 100% CPU, 700 MB RAM · SQL target memory 3035 MB
- Client: NguyenThiGiai · k6.exe v2.0.0 (commit/8c3be52cc1, go1.26.3, windows/amd64) · node v24.14.0 · commit bộ test 5e136f00 (dirty)

## Baseline (tuần tự, chạy trên VPS — p50 / p95 ms)

| Endpoint | normal (320 task) | heavy (3200 task) | bytes heavy |
|---|---|---|---|
| GET /api/project (không token, sàn pipeline) | 2.9 / 8.8 | 1.5 / 4.3 | 0 |
| GET /api/project | 15.6 / 20.2 | 15.6 / 28.3 | 14284 |
| GET /api/project?status=active,open&deletedAt=null | 12 / 16.5 | 14.5 / 24.4 | 8988 |
| GET /api/project/{id} | 8.6 / 11.7 | 9.9 / 13.9 | 554 |
| GET /api/task?projectIds={id}&deletedAt=null | 15.6 / 20.4 | 21.4 / 49.8 | 118308 |
| GET /api/task?status=open,in_progress,...&priority=... | 77.7 / 99.8 | 295 / 513.5 | 3275320 |
| GET /api/task (toàn bộ task của user) | 91.1 / 126 | 440.8 / 873.7 | 4724520 |
| GET /api/task?deletedAt=null | 41.5 / 62 | 260.7 / 920.6 | 4724520 |
| GET /api/task/{id} | 12.5 / 16 | 19.5 / 39.9 | 1340 |
| GET /api/task?searchText=... | 57.8 / 106.9 | 130.9 / 223.6 | 714880 |
| GET /api/taskcomment?taskId={id} | 12.9 / 21.7 | 9.5 / 13.8 | 3974 |
| POST /api/task (tạo 1 task) | 36.9 / 49.6 | 25.2 / 30.3 | 733 |
| PATCH /api/task/{id} (status) | 34.6 / 43.2 | 26.7 / 38.3 | 752 |
| POST /api/taskcomment (tạo comment) | 21.5 / 25.1 | 18 / 19.7 | 426 |
| DELETE /api/task (xoá vĩnh viễn 1 task) | 111.2 / 159 | 107.1 / 135.3 | 205 |

## VPS theo pha (avg / max; CPU process: 100 = 1 core; host: 100 = cả máy)

| Pha | mẫu | load1 | host CPU | iowait | RAM trống MB (min) | swap MB (max) | SQL CPU | BE prod CPU | BE perf CPU | RSS SQL / perf MB (max) | thread perf (max) | prod ms (avg/max) | prod lỗi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 2 | 1.5 / 1.53 | 22 / 29 | 10.5 / 20 | 2397 | 1598 | 9 / 11 | 29.5 / 41 | 1 / 2 | 370 / 128 | 19 | 1.1 / 1.3 | 0 |
| during | 17 | 1.5 / 2.07 | 61.9 / 87 | 2.7 / 10 | 2048 | 1595 | 36.8 / 100 | 2.8 / 20 | 63.5 / 92 | 405 / 233 | 23 | 2.1 / 6.3 | 0 |
| after | 3 | 1.8 / 1.91 | 21.7 / 54 | 1.7 / 3 | 2160 | 1573 | 13.7 / 36 | 3 / 4 | 15 / 43 | 405 / 233 | 23 | 1.6 / 1.7 | 0 |

## SQL Server trong run (99s, toàn instance)

- Chờ khoá LCK_*: **35 lần, 388 ms** · PAGEIOLATCH 184 ms · WRITELOG 2216 ms · ASYNC_NETWORK_IO 67 ms · SOS_SCHEDULER_YIELD 309 ms
- Counter: Lazy writes/sec 0 · Page reads/sec 14.86 · Page writes/sec 66.77 · Page life expectancy 176 · Page life expectancy [000] 176 · User Connections 4 · Processes blocked 0 · Lock Requests/sec 39547.76 · Lock Timeouts/sec 0.1 · Number of Deadlocks/sec 0 · Lock Waits/sec 0.18 · Lock Wait Time (ms) 3.91 · Transactions/sec [SuperApp-perf] 11.42 · Log Flushes/sec [SuperApp-perf] 6.51 · Log Bytes Flushed/sec [SuperApp-perf] 11810.13 · Full Scans/sec 18.68 · Index Searches/sec 3793 · Batch Requests/sec 35.6 · SQL Compilations/sec 1.13 · SQL Re-Compilations/sec 0.04 · Memory Grants Pending 0 · Version Store Size (KB) 0
- IO file SuperApp-perf: ROWS: 44 read (4.38 MB, 1.48 ms/read), 0 write (0 MB, 0 ms/write) · LOG: 0 read (0 MB, 0 ms/read), 644 write (1.11 MB, 2.1 ms/write)

| Wait top | lần | ms |
|---|---|---|
| CXSYNC_PORT | 1206 | 7294 |
| CXPACKET | 9381 | 2940 |
| WRITELOG | 843 | 2216 |
| CXCONSUMER | 608 | 2191 |
| WAIT_ON_SYNC_STATISTICS_REFRESH | 39 | 1224 |
| IO_COMPLETION | 813 | 614 |
| SOS_SCHEDULER_YIELD | 5391 | 309 |
| LCK_M_S | 24 | 306 |
| CXSYNC_CONSUMER | 198 | 190 |
| RESERVED_MEMORY_ALLOCATION_EXT | 94134 | 169 |
| PAGEIOLATCH_SH | 88 | 151 |
| LATCH_EX | 1199 | 146 |
| LCK_M_X | 11 | 82 |
| PREEMPTIVE_OS_QUERYREGISTRY | 94 | 73 |
| ASYNC_NETWORK_IO | 132 | 67 |

