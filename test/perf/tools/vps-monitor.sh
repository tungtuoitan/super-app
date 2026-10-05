#!/usr/bin/env bash
# **Fullpath:** /test/perf/tools/vps-monitor.sh
#
# Chạy TRÊN VPS (perf.mjs scp + ssh) suốt 1 run. Mỗi INTERVAL giây in 1 dòng CSV:
#   epoch, load1, host_cpu (% cả máy, 100 = mọi core), iowait (% cả máy), mem_avail_mb, swap_used_mb,
#   cpu_sql / cpu_prod_be / cpu_perf_be (% — 100 = 1 core), rss_*_mb, threads_perf_be,
#   prod_ms + prod_code (GET 127.0.0.1:5000/api/project -> 401: độ trễ prod phía server, bỏ qua mạng).
# CPU tính từ delta /proc (tức thời), không dùng `ps %cpu` (trung bình từ lúc process khởi động).
# Dừng khi phiên SSH đóng.
INTERVAL="${INTERVAL:-5}"
CLK=$(getconf CLK_TCK)
pid_sql=$(pgrep -x sqlservr | tail -1)
pid_prod=$(systemctl show superapp-api -p MainPID --value)
pid_perf=$(systemctl show superapp-perf -p MainPID --value)

ticks() { [ -r "/proc/$1/stat" ] && awk '{print $14+$15}' "/proc/$1/stat" || echo 0; }
rss() { [ -r "/proc/$1/status" ] && awk '/VmRSS/ {printf "%d", $2/1024}' "/proc/$1/status" || echo 0; }
threads() { [ -r "/proc/$1/status" ] && awk '/Threads/ {print $2}' "/proc/$1/status" || echo 0; }
host() { awk '/^cpu / {idle=$5; iow=$6; tot=0; for (i=2;i<=NF;i++) tot+=$i; print idle, iow, tot}' /proc/stat; }
mem() { awk '/MemAvailable/ {a=$2} /SwapTotal/ {st=$2} /SwapFree/ {sf=$2} END {printf "%d %d", a/1024, (st-sf)/1024}' /proc/meminfo; }

echo "epoch,load1,host_cpu,iowait,mem_avail_mb,swap_used_mb,cpu_sql,cpu_prod_be,cpu_perf_be,rss_sql_mb,rss_prod_be_mb,rss_perf_be_mb,threads_perf_be,prod_ms,prod_code"
read -r i0 w0 t0 < <(host); s0=$(ticks "$pid_sql"); p0=$(ticks "$pid_prod"); f0=$(ticks "$pid_perf")
while sleep "$INTERVAL"; do
  read -r i1 w1 t1 < <(host); s1=$(ticks "$pid_sql"); p1=$(ticks "$pid_prod"); f1=$(ticks "$pid_perf")
  read -r code secs < <(curl -s -o /dev/null -w '%{http_code} %{time_total}\n' --max-time 10 http://127.0.0.1:5000/api/project || echo "000 10")
  read -r avail swap < <(mem)
  awk -v e="$(date +%s)" -v l1="$(cut -d' ' -f1 /proc/loadavg)" \
      -v di=$((i1 - i0)) -v dw=$((w1 - w0)) -v dt=$((t1 - t0)) -v ds=$((s1 - s0)) -v dp=$((p1 - p0)) -v df=$((f1 - f0)) \
      -v clk="$CLK" -v iv="$INTERVAL" -v av="$avail" -v sw="$swap" \
      -v rs="$(rss "$pid_sql")" -v rp="$(rss "$pid_prod")" -v rf="$(rss "$pid_perf")" -v th="$(threads "$pid_perf")" \
      -v ms="$secs" -v code="$code" \
      'BEGIN { printf "%s,%s,%.0f,%.0f,%s,%s,%.0f,%.0f,%.0f,%s,%s,%s,%s,%.1f,%s\n", e, l1,
               (dt ? 100 * (dt - di - dw) / dt : 0), (dt ? 100 * dw / dt : 0), av, sw,
               100 * ds / clk / iv, 100 * dp / clk / iv, 100 * df / clk / iv, rs, rp, rf, th, ms * 1000, code }'
  i0=$i1; w0=$w1; t0=$t1; s0=$s1; p0=$p1; f0=$f1
done
