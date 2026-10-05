#!/usr/bin/env bash
# **Fullpath:** /test/perf/be/start-perf-be.sh
#
# Khởi động BE perf ĐÃ deploy (/opt/superapp-perf/app + .env) — không build lại. Unit systemd tạm
# `superapp-perf`: User=www-data, 127.0.0.1:5100, CPUQuota=100% (≈1 core), MemoryMax=700M.
# Đổi quota để thử: CPU_QUOTA=200% MEMORY_MAX=1G be/start-perf-be.sh (perf.mjs ghi lại quota vào env.json).
set -euo pipefail
ssh -o BatchMode=yes vps-superapp "CPU_QUOTA='${CPU_QUOTA:-100%}' MEMORY_MAX='${MEMORY_MAX:-700M}' bash -s" <<'REMOTE'
set -euo pipefail
base=/opt/superapp-perf
[ -f "$base/app/SuperAppAPI.dll" ] && [ -f "$base/.env" ] || { echo "Chưa deploy — chạy be/deploy-perf-be.sh" >&2; exit 1; }
if grep -q 'Database=SuperApp-pro' "$base/.env"; then echo "ABORT: .env perf trỏ SuperApp-pro" >&2; exit 1; fi
systemctl stop superapp-perf 2>/dev/null || true
systemctl reset-failed superapp-perf 2>/dev/null || true
systemd-run --quiet --unit=superapp-perf \
  --property=User=www-data --property=WorkingDirectory="$base/app" \
  --property=CPUQuota="$CPU_QUOTA" --property=MemoryMax="$MEMORY_MAX" \
  --setenv=ASPNETCORE_ENVIRONMENT=Production \
  /usr/bin/dotnet "$base/app/SuperAppAPI.dll" --urls http://127.0.0.1:5100
for i in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5100/api/project || true)" = "401" ] && {
    echo "perf BE up (build $(cat "$base/app/PERF_BUILD_SHA"), CPUQuota $CPU_QUOTA, MemoryMax $MEMORY_MAX) on 127.0.0.1:5100"; exit 0; }
  sleep 1
done
echo "perf BE không lên — log:" >&2; journalctl -u superapp-perf --no-pager -n 30 >&2; exit 1
REMOTE
