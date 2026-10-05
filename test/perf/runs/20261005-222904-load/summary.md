# Run 20261005-222904-load

- Loại: **load** · ghi chú: dồn tải 10 VU, chưa sửa (RCSI OFF)
- Tham số: `{"VUS":"10","DURATION":"1m","RAMP":"10s","THINK_MS":"0"}` · BE build `037b557` · thử nghiệm DB: không
- DB: RCSI OFF · 78400 task · index pro.task: ix_task_parent_task_id (filtered), ix_task_project_id (filtered), ix_task_start_end_date (filtered), ix_task_status (filtered), pk_task
- Server: Intel(R) Xeon(R) Platinum 8272CL CPU @ 2.60GHz × 2 core · RAM 3912 MB (trống lúc bắt đầu 2230 MB, swap dùng 1401 MB, load 1) · SQL Server 16.0.4225.2 (max memory 2147483647 MB) · BE perf quota 100% CPU, 700 MB RAM · SQL target memory 2950 MB
- Client: NguyenThiGiai · k6.exe v2.0.0 (commit/8c3be52cc1, go1.26.3, windows/amd64) · node v24.14.0 · commit bộ test 5e136f00 (dirty)

## Load

1115 request · **12.55 req/s** · lỗi 0% · 938 lượt · VU max 10 · nhận 266.43 MB · thresholds FAIL

| | med | p95 | p99 | max |
|---|---|---|---|---|
| tất cả | 141.8 | 3492.7 | 9687.4 | 13477.8 |
| chờ server (waiting) | 135.9 | 3423.5 | 9687.4 | 12596.1 |
| tải response (receiving) | 0 | 287.6 | 704.6 | 1111.3 |
| đọc | 121.3 | 2672.5 | 7509.9 | 13477.8 |
| ghi | 298 | 7379.1 | 11234.3 | 11524.3 |
| PATCH /api/task/{id} (69) | 399.7 | 9922.4 | 11377.7 | 11524.3 |
| GET /api/taskcomment (97) | 76 | 288.1 | 327.7 | 355.1 |
| POST /api/task (49) | 311.3 | 987.3 | 2772.4 | 3444 |
| GET /api/task?status&priority (141) | 1104 | 7826.9 | 13199.4 | 13477.8 |
| GET /api/task/{id} (142) | 91.6 | 301 | 339.8 | 406.8 |
| DELETE /api/task (39) | 1788.2 | 9935.9 | 11126 | 11513.1 |
| GET floor (401) (108) | 19.4 | 245 | 256.5 | 260.5 |
| GET /api/task?projectIds (261) | 102 | 315.4 | 398.9 | 527 |
| GET /api/project (139) | 76.3 | 302.7 | 407 | 499.2 |
| POST /api/taskcomment (60) | 151.6 | 299.5 | 344.7 | 359.3 |

## VPS theo pha (avg / max; CPU process: 100 = 1 core; host: 100 = cả máy)

| Pha | mẫu | load1 | host CPU | iowait | RAM trống MB (min) | swap MB (max) | SQL CPU | BE prod CPU | BE perf CPU | RSS SQL / perf MB (max) | thread perf (max) | prod ms (avg/max) | prod lỗi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 2 | 0.9 / 0.92 | 5.5 / 6 | 0 / 0 | 2217 | 1398 | 2 / 2 | 1 / 1 | 1.5 / 2 | 490 / 128 | 19 | 1.1 / 1.1 | 0 |
| during | 18 | 1.7 / 2.81 | 43.3 / 85 | 0.8 / 2 | 2048 | 1398 | 30.3 / 70 | 1 / 1 | 43.7 / 90 | 502 / 253 | 30 | 1.7 / 4.6 | 0 |
| after | 3 | 1.5 / 1.65 | 14 / 32 | 1 / 2 | 2059 | 1396 | 8 / 20 | 1 / 1 | 6.7 / 18 | 503 / 249 | 26 | 1.2 / 1.4 | 0 |

## SQL Server trong run (105.8s, toàn instance)

- Chờ khoá LCK_*: **338 lần, 451018 ms** · PAGEIOLATCH 352 ms · WRITELOG 2544 ms · ASYNC_NETWORK_IO 0 ms · SOS_SCHEDULER_YIELD 28126 ms
- Counter: Lazy writes/sec 0 · Page reads/sec 11.73 · Page writes/sec 0.47 · Page life expectancy 555 · Page life expectancy [000] 555 · User Connections 16 · Processes blocked 0 · Lock Requests/sec 22838.28 · Lock Timeouts/sec 5.9 · Number of Deadlocks/sec 0.44 · Lock Waits/sec 2.93 · Lock Wait Time (ms) 4266.99 · Transactions/sec [SuperApp-perf] 11.01 · Log Flushes/sec [SuperApp-perf] 4.58 · Log Bytes Flushed/sec [SuperApp-perf] 12147.73 · Full Scans/sec 14.6 · Index Searches/sec 490.37 · Batch Requests/sec 29.98 · SQL Compilations/sec 1.11 · SQL Re-Compilations/sec 0 · Memory Grants Pending 0 · Version Store Size (KB) 0
- IO file SuperApp-perf: ROWS: 129 read (9.7 MB, 3.01 ms/read), 0 write (0 MB, 0 ms/write) · LOG: 0 read (0 MB, 0 ms/read), 485 write (1.23 MB, 2.85 ms/write)

| Wait top | lần | ms |
|---|---|---|
| LCK_M_S | 229 | 325743 |
| LCK_M_IX | 93 | 108629 |
| CXCONSUMER | 133 | 41453 |
| SOS_SCHEDULER_YIELD | 4902 | 28126 |
| LCK_M_RS_U | 14 | 16627 |
| WRITELOG | 501 | 2544 |
| CXSYNC_PORT | 255 | 1627 |
| LATCH_EX | 174 | 735 |
| WAIT_ON_SYNC_STATISTICS_REFRESH | 32 | 652 |
| CXSYNC_CONSUMER | 43 | 358 |
| PAGEIOLATCH_SH | 88 | 252 |
| PREEMPTIVE_OS_AUTHENTICATIONOPS | 28 | 239 |
| PREEMPTIVE_OS_QUERYREGISTRY | 101 | 147 |
| PAGEIOLATCH_EX | 47 | 100 |
| RESERVED_MEMORY_ALLOCATION_EXT | 44373 | 99 |

