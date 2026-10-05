# Run 20261005-222532-load

- Loại: **load** · ghi chú: load nhẹ 20 VU, chưa sửa (RCSI OFF)
- Tham số: `{"VUS":"20","DURATION":"2m","RAMP":"20s","THINK_MS":"1000"}` · BE build `037b557` · thử nghiệm DB: không
- DB: RCSI OFF · 78400 task · index pro.task: ix_task_parent_task_id (filtered), ix_task_project_id (filtered), ix_task_start_end_date (filtered), ix_task_status (filtered), pk_task
- Server: Intel(R) Xeon(R) Platinum 8272CL CPU @ 2.60GHz × 2 core · RAM 3912 MB (trống lúc bắt đầu 2221 MB, swap dùng 1529 MB, load 0.81) · SQL Server 16.0.4225.2 (max memory 2147483647 MB) · BE perf quota 100% CPU, 700 MB RAM · SQL target memory 2866 MB
- Client: NguyenThiGiai · k6.exe v2.0.0 (commit/8c3be52cc1, go1.26.3, windows/amd64) · node v24.14.0 · commit bộ test 5e136f00 (dirty)

## Load

2389 request · **14.35 req/s** · lỗi 0% · 2038 lượt · VU max 20 · nhận 329.91 MB · thresholds FAIL

| | med | p95 | p99 | max |
|---|---|---|---|---|
| tất cả | 35.4 | 468.1 | 10874.5 | 15402.9 |
| chờ server (waiting) | 31.9 | 358.3 | 10640.6 | 15295 |
| tải response (receiving) | 0 | 48.9 | 295.6 | 577.1 |
| đọc | 31.4 | 446.6 | 3721.9 | 15402.9 |
| ghi | 69.4 | 1267.9 | 14220.8 | 14776.1 |
| DELETE /api/task (84) | 197.2 | 14335.1 | 14767.6 | 14776.1 |
| GET /api/taskcomment (205) | 24.7 | 186.6 | 235.2 | 275.3 |
| POST /api/task (103) | 60 | 410.8 | 4990.5 | 6330.4 |
| GET /api/task/{id} (306) | 22.1 | 162.9 | 215.5 | 266.4 |
| GET /api/project (326) | 20.7 | 163.2 | 233.8 | 317 |
| PATCH /api/task/{id} (160) | 65.8 | 9838.8 | 12813.6 | 14199.8 |
| GET /api/task?status&priority (316) | 203.4 | 3911.7 | 12683 | 15402.9 |
| GET /api/task?projectIds (518) | 31.6 | 195.5 | 254.9 | 611.7 |
| POST /api/taskcomment (144) | 40.5 | 156.5 | 248.8 | 257.8 |
| GET floor (401) (207) | 6 | 121.2 | 242.8 | 247.1 |

## VPS theo pha (avg / max; CPU process: 100 = 1 core; host: 100 = cả máy)

| Pha | mẫu | load1 | host CPU | iowait | RAM trống MB (min) | swap MB (max) | SQL CPU | BE prod CPU | BE perf CPU | RSS SQL / perf MB (max) | thread perf (max) | prod ms (avg/max) | prod lỗi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 2 | 0.9 / 0.9 | 4 / 4 | 0 / 0 | 2216 | 1528 | 2 / 2 | 1 / 1 | 1.5 / 2 | 408 / 128 | 18 | 0.9 / 0.9 | 0 |
| during | 34 | 1.4 / 2.19 | 38.8 / 60 | 1.7 / 6 | 1995 | 1528 | 28.2 / 50 | 1 / 2 | 37.4 / 83 | 489 / 249 | 26 | 2 / 7.8 | 0 |
| after | 3 | 1.1 / 1.09 | 16 / 28 | 1 / 2 | 2103 | 1402 | 8.7 / 19 | 12.7 / 29 | 0.7 / 1 | 490 / 248 | 21 | 1.4 / 1.6 | 0 |

## SQL Server trong run (183.5s, toàn instance)

- Chờ khoá LCK_*: **228 lần, 481608 ms** · PAGEIOLATCH 285 ms · WRITELOG 3134 ms · ASYNC_NETWORK_IO 0 ms · SOS_SCHEDULER_YIELD 21443 ms
- Counter: Lazy writes/sec 0 · Page reads/sec 8.9 · Page writes/sec 0.27 · Page life expectancy 421 · Page life expectancy [000] 421 · User Connections 23 · Processes blocked 0 · Lock Requests/sec 24565.17 · Lock Timeouts/sec 2.29 · Number of Deadlocks/sec 0.14 · Lock Waits/sec 1.08 · Lock Wait Time (ms) 2625.06 · Transactions/sec [SuperApp-perf] 10.28 · Log Flushes/sec [SuperApp-perf] 5.31 · Log Bytes Flushed/sec [SuperApp-perf] 11641.69 · Full Scans/sec 17.21 · Index Searches/sec 449.96 · Batch Requests/sec 37.1 · SQL Compilations/sec 0.89 · SQL Re-Compilations/sec 0 · Memory Grants Pending 0 · Version Store Size (KB) 0
- IO file SuperApp-perf: ROWS: 177 read (12.7 MB, 1.76 ms/read), 0 write (0 MB, 0 ms/write) · LOG: 0 read (0 MB, 0 ms/read), 975 write (2.04 MB, 2.34 ms/write)

| Wait top | lần | ms |
|---|---|---|
| LCK_M_S | 147 | 340629 |
| LCK_M_IX | 70 | 124856 |
| CXCONSUMER | 285 | 81827 |
| SOS_SCHEDULER_YIELD | 8389 | 21443 |
| LCK_M_RS_U | 8 | 16103 |
| WRITELOG | 993 | 3134 |
| CXSYNC_PORT | 552 | 1508 |
| LATCH_EX | 523 | 721 |
| WAIT_ON_SYNC_STATISTICS_REFRESH | 32 | 615 |
| PREEMPTIVE_OS_AUTHENTICATIONOPS | 54 | 358 |
| CXSYNC_CONSUMER | 92 | 258 |
| PAGEIOLATCH_SH | 133 | 211 |
| RESERVED_MEMORY_ALLOCATION_EXT | 67774 | 164 |
| EXECSYNC | 37 | 104 |
| PAGEIOLATCH_EX | 43 | 74 |

