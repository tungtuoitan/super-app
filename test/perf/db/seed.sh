#!/usr/bin/env bash
# **Fullpath:** /test/perf/db/seed.sh
#
# Dựng lại SuperApp-perf từ đầu: clone schema dev (01) -> seed data tổng hợp (02) -> backup .bak (03).
# Sau đó mỗi lần cần data sạch chỉ việc restore (04, vài giây).
#
# Password của user perf+NNNN@test.local = PERF_PASSWORD (mặc định LoadTest@123 — cùng mật khẩu test
# của toolkit loadtest/, KHÔNG phải password thật). Hash bcrypt (rounds 11, khớp AuthService) sinh
# tại chỗ bằng bcryptjs trong loadtest/node_modules.
#
# Dùng (từ test/perf/):  db/seed.sh [USERS=200] [PROJECTS_PER_USER=40] [TASKS_PER_PROJECT=8] ...
set -euo pipefail
cd "$(dirname "$0")/.."

declare -A P=([USERS]=200 [PROJECTS_PER_USER]=40 [TASKS_PER_PROJECT]=8 [COMMENTS_PER_TASK]=5 [HEAVY_USERS]=5 [HEAVY_FACTOR]=10)
for kv in "$@"; do P[${kv%%=*}]="${kv#*=}"; done

hash=$(PERF_PASSWORD="${PERF_PASSWORD:-LoadTest@123}" node -e '
  const b = require("../loadtest/node_modules/bcryptjs");
  process.stdout.write(b.hashSync(process.env.PERF_PASSWORD, 11));')

args=(); for k in "${!P[@]}"; do args+=("$k=${P[$k]}"); done

echo "== 01 create SuperApp-perf (clone schema dev)"; ./vps-sql.sh db/01-create-perf-db.sql master | tail -3
echo "== 02 seed ${args[*]}";                        ./vps-sql.sh db/02-seed-perf-data.sql SuperApp-perf "${args[@]}" "PWHASH=$hash"
echo "== 03 backup";                                 ./vps-sql.sh db/03-backup-perf-db.sql master | tail -2
