#!/usr/bin/env bash
# **Fullpath:** /test/perf/be/stop-perf-be.sh
# Dừng instance BE perf trên VPS (unit tạm superapp-perf). Giữ nguyên /opt/superapp-perf để chạy lại.
set -euo pipefail
ssh -o BatchMode=yes vps-superapp 'systemctl stop superapp-perf 2>/dev/null || true; systemctl reset-failed superapp-perf 2>/dev/null || true; echo "superapp-perf: $(systemctl is-active superapp-perf 2>/dev/null || true)"'
