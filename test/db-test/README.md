# SuperApp Test DB Toolkit

Build, backup, and restore the frozen `SuperApp-test` database for load testing.

**Why:** Restore from `.bak` (~24s) is much faster than re-seeding 1000 users + cloning 3M rows (~18 min) before every test run.

## What's in SuperApp-test

Snapshot of `SuperApp-pro` user `hoanhtungle@gmail.com` fanned out across 1000 loadtest users. ~3.087 million rows total. See `~/.claude/skills/superapp-test/SKILL.md` for the full table breakdown.

## Files

| File | Purpose |
|------|---------|
| `setup.ps1` | One-time: clone schema → seed users → clone all data → backup |
| `restore.ps1` | Restore baseline from `.bak` (~24s, run before each test sweep) |
| `scripts/clone-schema.js` | DBCC CLONEDATABASE `SuperApp-dev` → `SuperApp-test` |
| `scripts/clone-all.js` | Pure-SQL set-based bulk clone of all user-scoped data |
| `scripts/backup.js` | `BACKUP DATABASE` → `/var/opt/mssql/data/SuperApp-test.bak` |
| `scripts/restore.js` | `RESTORE DATABASE WITH REPLACE` |
| `.env.example` | Defaults for `TEST_DB_NAME` and `TEST_DB_BACKUP_PATH` |

## Quickstart

### One-time setup (~18 min)

```powershell
cd C:\Users\Admin\source\SuperApp\test\db-test
.\setup.ps1
```

### Each test sweep

```powershell
# 1. Restore baseline (~24s)
.\restore.ps1

# 2. Restart BE pointed at test DB
# Cách đơn giản nhất: tạm swap Database=SuperApp-dev -> SuperApp-test trong Timeline\.env
# (DotNetEnv override mọi env var nên $env:ConnectionStrings__... không hiệu quả)

# 3. Re-prewarm tokens (BE just restarted)
cd C:\Users\Admin\source\SuperApp\test\loadtest
node prewarm-tokens.js

# 4. Run k6 (any scenario from test\loadtest\ or test\test-workspace-api\)
.\bin\k6.exe run -e VUS=200 -e RAMP_UP=30s -e STEADY=1m -e RAMP_DOWN=15s k6\scenario-noauth.js
```

## Why pure-SQL bulk clone

The original per-user Node loop (`..\test-workspace-api\clone-data.js`) takes ~18 min for *just* workspace data. With full prod data shape across all user-scoped tables (~3M rows), it would take 5-8 hours.

`scripts/clone-all.js` uses cross-DB `INSERT ... SELECT ... CROSS JOIN target_users` and `MERGE ... OUTPUT INTO` to do all 1000 user fan-outs in a handful of set-based statements. ~18 min total for ~3M rows.

Staging tables (`dbo._stage_*`) live in the test DB itself rather than tempdb — mssql node connection pooling drops `#temp` tables between requests, so they had to be promoted. They're dropped at the end.

## Disk usage

- DB data: ~5.5 GB
- Backup file: ~30 MB compressed
- Log file: ~100 MB (set to SIMPLE recovery and shrunk by setup script)

VPS has 49 GB total. Setup script reclaims log space before backup, otherwise the disk fills up after large DML.
