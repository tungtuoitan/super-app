# Run 20261005-223340-baseline

- Loại: **baseline** · ghi chú: baseline, thử RCSI ON + index parent_task_id
- Tham số: `{"REPS":30}` · BE build `037b557` · thử nghiệm DB: db/experiments/rcsi-and-parent-index.sql
- DB: RCSI ON · 78400 task · index pro.task: ix_task_parent_task_id (filtered), ix_task_parent_task_id_all, ix_task_project_id (filtered), ix_task_start_end_date (filtered), ix_task_status (filtered), pk_task
- Server: Intel(R) Xeon(R) Platinum 8272CL CPU @ 2.60GHz × 2 core · RAM 3912 MB (trống lúc bắt đầu 2205 MB, swap dùng 1347 MB, load 3.72) · SQL Server 16.0.4225.2 (max memory 2147483647 MB) · BE perf quota 100% CPU, 700 MB RAM · SQL target memory 2938 MB
- Client: NguyenThiGiai · k6.exe v2.0.0 (commit/8c3be52cc1, go1.26.3, windows/amd64) · node v24.14.0 · commit bộ test 5e136f00 (dirty)

## Baseline (tuần tự, chạy trên VPS — p50 / p95 ms)

| Endpoint | normal (320 task) | heavy (3200 task) | bytes heavy |
|---|---|---|---|
| GET /api/project (không token, sàn pipeline) | 1.8 / 11.3 | 1.7 / 3.9 | 0 |
| GET /api/project | 13 / 15.8 | 10.4 / 17.6 | 14284 |
| GET /api/project?status=active,open&deletedAt=null | 11.7 / 14.5 | 10.4 / 14.9 | 8988 |
| GET /api/project/{id} | 7.7 / 10 | 7 / 9.1 | 554 |
| GET /api/task?projectIds={id}&deletedAt=null | 17.6 / 25.2 | 22.3 / 28.2 | 118308 |
| GET /api/task?status=open,in_progress,...&priority=... | 79.1 / 124.1 | 302.7 / 691 | 3275320 |
| GET /api/task (toàn bộ task của user) | 74 / 96.4 | 454.1 / 964.4 | 4724520 |
| GET /api/task?deletedAt=null | 43.7 / 63.5 | 208.4 / 478 | 4724520 |
| GET /api/task/{id} | 13.4 / 19.7 | 8.7 / 13.9 | 1340 |
| GET /api/task?searchText=... | 51.9 / 86.6 | 120.5 / 222.8 | 714880 |
| GET /api/taskcomment?taskId={id} | 13.9 / 17 | 11.2 / 15.3 | 3974 |
| POST /api/task (tạo 1 task) | 30.3 / 46.2 | 31.7 / 37.7 | 733 |
| PATCH /api/task/{id} (status) | 27.4 / 32.5 | 31.4 / 37.5 | 752 |
| POST /api/taskcomment (tạo comment) | 19.4 / 25.6 | 13.2 / 18.8 | 426 |
| DELETE /api/task (xoá vĩnh viễn 1 task) | 36.5 / 46 | 35.8 / 49.4 | 205 |

## VPS theo pha (avg / max; CPU process: 100 = 1 core; host: 100 = cả máy)

| Pha | mẫu | load1 | host CPU | iowait | RAM trống MB (min) | swap MB (max) | SQL CPU | BE prod CPU | BE perf CPU | RSS SQL / perf MB (max) | thread perf (max) | prod ms (avg/max) | prod lỗi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 2 | 3.3 / 3.42 | 6.5 / 7 | 0 / 0 | 2196 | 1347 | 2 / 2 | 1 / 1 | 1.5 / 2 | 523 / 128 | 18 | 1.9 / 2.8 | 0 |
| during | 15 | 2.6 / 2.9 | 62.6 / 76 | 1.5 / 10 | 1948 | 1347 | 31.6 / 73 | 1.5 / 6 | 67.6 / 90 | 524 / 231 | 23 | 1.4 / 2.4 | 0 |
| after | 3 | 2.1 / 2.32 | 19.3 / 45 | 2 / 5 | 2100 | 1346 | 5 / 11 | 1 / 1 | 19.7 / 57 | 524 / 235 | 23 | 1.2 / 1.3 | 0 |

## SQL Server trong run (88.6s, toàn instance)

- Chờ khoá LCK_*: **8 lần, 55 ms** · PAGEIOLATCH 65 ms · WRITELOG 1518 ms · ASYNC_NETWORK_IO 0 ms · SOS_SCHEDULER_YIELD 164 ms
- Counter: Lazy writes/sec 0 · Page reads/sec 7.24 · Page writes/sec 71.49 · Page life expectancy 815 · Page life expectancy [000] 815 · User Connections 4 · Processes blocked 0 · Lock Requests/sec 1044.22 · Lock Timeouts/sec 0.01 · Number of Deadlocks/sec 0 · Lock Waits/sec 0.03 · Lock Wait Time (ms) 0.72 · Transactions/sec [SuperApp-perf] 12.71 · Log Flushes/sec [SuperApp-perf] 7.33 · Log Bytes Flushed/sec [SuperApp-perf] 13401.72 · Full Scans/sec 19.58 · Index Searches/sec 3927.23 · Batch Requests/sec 37.83 · SQL Compilations/sec 0.98 · SQL Re-Compilations/sec 0.01 · Memory Grants Pending 0 · Version Store Size (KB) 216
- IO file SuperApp-perf: ROWS: 44 read (4.38 MB, 1.48 ms/read), 0 write (0 MB, 0 ms/write) · LOG: 0 read (0 MB, 0 ms/read), 649 write (1.13 MB, 2.07 ms/write)

| Wait top | lần | ms |
|---|---|---|
| CXSYNC_PORT | 815 | 6690 |
| CXPACKET | 10890 | 2611 |
| WRITELOG | 655 | 1518 |
| WAIT_ON_SYNC_STATISTICS_REFRESH | 35 | 1076 |
| IO_COMPLETION | 805 | 642 |
| CXCONSUMER | 405 | 382 |
| LATCH_EX | 965 | 190 |
| SOS_SCHEDULER_YIELD | 3467 | 164 |
| CXSYNC_CONSUMER | 132 | 155 |
| RESERVED_MEMORY_ALLOCATION_EXT | 89474 | 114 |
| PREEMPTIVE_OS_WRITEFILE | 9 | 75 |
| PREEMPTIVE_OS_QUERYREGISTRY | 115 | 60 |
| PAGEIOLATCH_SH | 41 | 52 |
| LCK_M_X | 7 | 49 |
| PREEMPTIVE_OS_AUTHENTICATIONOPS | 10 | 32 |

