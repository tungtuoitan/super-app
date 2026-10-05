#!/usr/bin/env bash
# **Fullpath:** /test/perf/be/deploy-perf-be.sh
#
# Build BE từ 1 checkout SẠCH (mặc định origin/master — không lấy thay đổi chưa commit) rồi chạy nó
# trên VPS như 1 instance PERF tách khỏi prod:
#   - /opt/superapp-perf/app        bản publish
#   - /opt/superapp-perf/.env       copy .env prod, đổi Database=SuperApp-pro -> SuperApp-perf,
#                                   Jwt__Key MỚI ngẫu nhiên (token perf KHÔNG dùng được trên prod và
#                                   ngược lại). root:www-data 640, sinh trên VPS, không in ra.
#   - rồi gọi be/start-perf-be.sh: unit systemd tạm `superapp-perf`, 127.0.0.1:5100 (không mở ra
#     ngoài), CPUQuota=100% (≈1/2 CPU của VPS), MemoryMax=700M — chừa tài nguyên cho prod.
# Không đụng superapp-api.service / /var/www/Timeline.
#
# Dùng (từ test/perf/):  be/deploy-perf-be.sh [git-ref]      # mặc định origin/master
# Dừng:                  be/stop-perf-be.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TIMELINE="${TIMELINE_REPO:-$HOME/source/timeline}"
REF="${1:-origin/master}"
WORK="$(mktemp -d)"
trap 'git -C "$TIMELINE" worktree remove --force "$WORK/src" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

git -C "$TIMELINE" fetch -q origin
git -C "$TIMELINE" worktree add -q --detach "$WORK/src" "$REF"
SHA="$(git -C "$WORK/src" rev-parse --short HEAD)"
echo "== build $REF ($SHA)"
dotnet publish "$WORK/src/SuperAppAPI" -c Release -o "$WORK/publish" --nologo -v q
echo "$SHA" > "$WORK/publish/PERF_BUILD_SHA"
tar -czf "$WORK/app.tgz" -C "$WORK/publish" .

echo "== upload + start on VPS"
scp -q "$WORK/app.tgz" vps-superapp:/tmp/superapp-perf.tgz
ssh -o BatchMode=yes vps-superapp 'bash -s' <<'REMOTE'
set -euo pipefail
base=/opt/superapp-perf
systemctl stop superapp-perf 2>/dev/null || true
systemctl reset-failed superapp-perf 2>/dev/null || true
mkdir -p "$base"
rm -rf "$base/app.new" && mkdir "$base/app.new" && tar -xzf /tmp/superapp-perf.tgz -C "$base/app.new" && rm -f /tmp/superapp-perf.tgz
rm -rf "$base/app" && mv "$base/app.new" "$base/app"
mkdir -p "$base/app/Logs" && chown www-data:www-data "$base/app/Logs"

umask 077
sed -e 's/Database=SuperApp-pro/Database=SuperApp-perf/g' /var/www/Timeline/.env | grep -v '^Jwt__Key=' > "$base/.env.tmp"
printf 'Jwt__Key=%s\n' "$(openssl rand -base64 48 | tr -d '\n')" >> "$base/.env.tmp"
mv "$base/.env.tmp" "$base/.env" && chown root:www-data "$base/.env" && chmod 640 "$base/.env"
if grep -q 'Database=SuperApp-pro' "$base/.env"; then echo "ABORT: .env perf vẫn trỏ SuperApp-pro" >&2; exit 1; fi
echo "connection strings -> $(grep -o 'Database=[^;]*' "$base/.env" | sort | uniq -c | tr '\n' ' ')"

REMOTE

"$(dirname "$0")/start-perf-be.sh"
