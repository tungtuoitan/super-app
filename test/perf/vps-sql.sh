#!/usr/bin/env bash
# **Fullpath:** /test/perf/vps-sql.sh
#
# Chạy 1 file .sql LOCAL bằng sqlcmd NGAY TRÊN VPS (qua SSH host `vps-superapp`).
# Password `sa` đọc tại chỗ từ /var/www/Timeline/.env vào SQLCMDPASSWORD — không qua argument,
# không in ra, không rời VPS (skill find-credential, mục "Chạy SQL trên VPS không lộ pass").
#
# Dùng:
#   ./vps-sql.sh <file.sql> [database] [NAME=VALUE ...]   # NAME=VALUE -> sqlcmd -v NAME="VALUE"
# Ví dụ:
#   ./vps-sql.sh db/01-create-perf-db.sql master
#   ./vps-sql.sh db/02-seed-perf-data.sql SuperApp-perf USERS=200 PROJECTS_PER_USER=40
set -euo pipefail

file="${1:?file.sql}"
db="${2:-master}"
shift $(( $# >= 2 ? 2 : 1 ))

vars=""
for kv in "$@"; do
  name="${kv%%=*}"; value="${kv#*=}"
  [[ "$name" =~ ^[A-Z_]+$ ]] || { echo "Biến không hợp lệ: $name" >&2; exit 2; }
  [[ "$value" != *"'"* ]] || { echo "Giá trị của $name không được chứa dấu nháy đơn" >&2; exit 2; }
  vars+=" -v $name='$value'"
done

ssh -o BatchMode=yes vps-superapp "export SQLCMDPASSWORD=\$(grep ConnectionStrings__SuperAppConnection /var/www/Timeline/.env | sed -E 's/.*Password=([^;]*).*/\1/'); /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -I -b -W -s '|' -d '$db' $vars" < "$file"
