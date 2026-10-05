# Run 20261005-223125-load

- Loại: **load** · ghi chú: dồn tải 10 VU, thử RCSI ON + index parent_task_id
- Tham số: `{"VUS":"10","DURATION":"1m","RAMP":"10s","THINK_MS":"0"}` · BE build `037b557` · thử nghiệm DB: db/experiments/rcsi-and-parent-index.sql
- DB: RCSI ON · 78400 task · index pro.task: ix_task_parent_task_id (filtered), ix_task_parent_task_id_all, ix_task_project_id (filtered), ix_task_start_end_date (filtered), ix_task_status (filtered), pk_task
- Server: Intel(R) Xeon(R) Platinum 8272CL CPU @ 2.60GHz × 2 core · RAM 3912 MB (trống lúc bắt đầu 2156 MB, swap dùng 1395 MB, load 1.29) · SQL Server 16.0.4225.2 (max memory 2147483647 MB) · BE perf quota 100% CPU, 700 MB RAM · SQL target memory 2871 MB
- Client: NguyenThiGiai · k6.exe v2.0.0 (commit/8c3be52cc1, go1.26.3, windows/amd64) · node v24.14.0 · commit bộ test 5e136f00 (dirty)

## Load

2790 request · **31.2 req/s** · lỗi 0% · 2391 lượt · VU max 10 · nhận 519.29 MB · thresholds FAIL

| | med | p95 | p99 | max |
|---|---|---|---|---|
| tất cả | 147.3 | 718.7 | 2323.6 | 3288.2 |
| chờ server (waiting) | 144.7 | 584.7 | 1539.8 | 3243.7 |
| tải response (receiving) | 0 | 170.4 | 799.9 | 1259.6 |
| đọc | 141.9 | 1310.7 | 2492.2 | 3236.1 |
| ghi | 203.1 | 392.4 | 542.1 | 805 |
| PATCH /api/task/{id} (168) | 203.7 | 385.4 | 540.3 | 674.5 |
| GET /api/task/{id} (377) | 112.9 | 289.8 | 382.7 | 460.4 |
| POST /api/taskcomment (164) | 143.8 | 299.9 | 354.3 | 388.6 |
| GET /api/task?projectIds (598) | 137.3 | 324.1 | 392.1 | 462.3 |
| POST /api/task (118) | 267.7 | 428.2 | 678.9 | 753.6 |
| GET floor (401) (261) | 29.3 | 247.4 | 279 | 298.9 |
| GET /api/taskcomment (253) | 117.1 | 301.6 | 338.3 | 363.7 |
| GET /api/project (365) | 95.9 | 265.8 | 310.3 | 534.9 |
| GET /api/task?status&priority (368) | 533.3 | 2527.5 | 3075.6 | 3236.1 |
| DELETE /api/task (108) | 257 | 468 | 662.6 | 805 |

## VPS theo pha (avg / max; CPU process: 100 = 1 core; host: 100 = cả máy)

| Pha | mẫu | load1 | host CPU | iowait | RAM trống MB (min) | swap MB (max) | SQL CPU | BE prod CPU | BE perf CPU | RSS SQL / perf MB (max) | thread perf (max) | prod ms (avg/max) | prod lỗi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 2 | 1.1 / 1.19 | 6 / 6 | 0.5 / 1 | 2154 | 1394 | 2 / 2 | 1 / 1 | 1.5 / 2 | 516 / 128 | 17 | 1.3 / 1.3 | 0 |
| during | 18 | 3.7 / 6.05 | 72.8 / 90 | 1.1 / 6 | 2035 | 1394 | 42.8 / 58 | 1.2 / 3 | 84.6 / 98 | 523 / 244 | 32 | 2 / 5.9 | 0 |
| after | 3 | 4.7 / 5.07 | 31 / 56 | 0.7 / 2 | 2078 | 1347 | 9.3 / 24 | 5.3 / 14 | 36 / 54 | 523 / 240 | 30 | 0.9 / 1.1 | 0 |

## SQL Server trong run (106s, toàn instance)

- Chờ khoá LCK_*: **6 lần, 63 ms** · PAGEIOLATCH 562 ms · WRITELOG 5434 ms · ASYNC_NETWORK_IO 0 ms · SOS_SCHEDULER_YIELD 29576 ms
- Counter: Lazy writes/sec 0 · Page reads/sec 17.9 · Page writes/sec 8.5 · Page life expectancy 697 · Page life expectancy [000] 697 · User Connections 13 · Processes blocked 0 · Lock Requests/sec 704.56 · Lock Timeouts/sec 0.08 · Number of Deadlocks/sec 0 · Lock Waits/sec 0.01 · Lock Wait Time (ms) 0.6 · Transactions/sec [SuperApp-perf] 18.51 · Log Flushes/sec [SuperApp-perf] 10.16 · Log Bytes Flushed/sec [SuperApp-perf] 21758.66 · Full Scans/sec 33.48 · Index Searches/sec 843.02 · Batch Requests/sec 74.33 · SQL Compilations/sec 1.65 · SQL Re-Compilations/sec 0 · Memory Grants Pending 0 · Version Store Size (KB) 416
- IO file SuperApp-perf: ROWS: 148 read (10.88 MB, 3.08 ms/read), 0 write (0 MB, 0 ms/write) · LOG: 0 read (0 MB, 0 ms/read), 1077 write (2.2 MB, 2.86 ms/write)

| Wait top | lần | ms |
|---|---|---|
| SOS_SCHEDULER_YIELD | 6726 | 29576 |
| WRITELOG | 1237 | 5434 |
| WAIT_ON_SYNC_STATISTICS_REFRESH | 31 | 487 |
| PAGEIOLATCH_SH | 169 | 373 |
| PREEMPTIVE_OS_AUTHENTICATIONOPS | 30 | 223 |
| RESERVED_MEMORY_ALLOCATION_EXT | 83958 | 209 |
| PAGEIOLATCH_EX | 40 | 189 |
| IO_COMPLETION | 143 | 141 |
| PREEMPTIVE_OS_CRYPTOPS | 45 | 97 |
| PREEMPTIVE_OS_QUERYREGISTRY | 116 | 80 |
| PREEMPTIVE_OS_NETVALIDATEPASSWORDPOLICY | 15 | 60 |
| LCK_M_RS_U | 2 | 58 |
| PREEMPTIVE_OS_CLOSEHANDLE | 8 | 42 |
| PREEMPTIVE_OS_WRITEFILE | 3 | 20 |
| PREEMPTIVE_OS_CRYPTACQUIRECONTEXT | 15 | 13 |

