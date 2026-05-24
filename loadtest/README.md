# SuperApp Load Test

Reusable load-testing toolkit for the SuperApp BE. Seeds N local-auth users, drives them through the heaviest read endpoints with [k6](https://k6.io/), then optionally cleans up.

Bypasses Google OAuth by using `POST /api/auth/login` (username + password) — no browser needed.

## Two scenarios

| Scenario | What it measures | When to use |
|----------|-----------------|-------------|
| **Full flow** (`scenario.js`) | Login + endpoint mix per VU | Realistic — sees bcrypt cost too |
| **No-auth** (`scenario-noauth.js`) | Endpoint mix only, prewarmed tokens | Isolates non-auth capacity (much higher) |

In our local baseline, the no-auth scenario hit ~735 req/s vs ~31 req/s with login at 1000 VUs — bcrypt at login is the dominant bottleneck.

## Endpoints exercised

1. `POST /api/auth/login` (full scenario only)
2. `GET  /api/userprofile`
3. `GET  /api/workspace`
4. `GET  /api/workspace/{id}/tree/v2` (only fires when user has workspaces — empty for fresh seeds)
5. `GET  /api/task`
6. `GET  /api/k`

## Prerequisites

- **Node.js 18+** — https://nodejs.org/
- **k6** — `winget install k6 --source winget` (or use the bundled `bin/k6.exe`)
- BE running locally (`dotnet run` in `Timeline\SuperAppAPI`) on `http://localhost:5000`
- DB credentials with write access to `[urm].[users]`

## First-time setup

```powershell
cd C:\Users\Admin\source\SuperApp\loadtest
copy .env.example .env
# Edit .env — fill in DB_PASSWORD at minimum
```

## Common workflows

```powershell
# Full flow (with login): seed -> test -> cleanup
.\run.ps1 -Seed -Cleanup

# No-auth capacity: seed -> prewarm tokens -> test -> cleanup
.\run.ps1 -Seed -Prewarm -NoAuth -Cleanup

# Just run the test (users already seeded)
.\run.ps1
.\run.ps1 -NoAuth                  # uses existing results\tokens.json

# Custom load profile
.\run.ps1 -Vus 500 -RampUp 1m -Steady 3m -RampDown 30s

# Seed only
.\run.ps1 -Seed -SkipTest

# Hit a different target
.\run.ps1 -BaseUrl http://10.0.0.5:5000
```

Results land in `results/summary-*.json`. Live progress prints to the terminal. k6 console errors stream to `results/k6-*.log` if you redirect.

## Files

| File                     | Purpose |
|--------------------------|---------|
| `run.ps1`                | Orchestrator (seed → prewarm → k6 → cleanup) |
| `seed-users.js`          | Inserts/restores N users in `[urm].[users]` with BCrypt-hashed password matching `Timeline.AuthService.LocalLoginAsync` |
| `prewarm-tokens.js`      | Logs in N users (concurrency=20), saves `results/tokens.json` |
| `cleanup-users.js`       | Soft-deletes loadtest users (`--hard` to purge rows) |
| `k6/scenario.js`         | Full flow (login per VU) |
| `k6/scenario-noauth.js`  | No-auth (reads tokens.json) |
| `k6/auth.js`             | Login helper for full scenario |
| `k6/config.js`           | Shared config — reads `__ENV` injected by `run.ps1` |
| `bin/k6.exe`             | Portable k6 v2.0.0 binary (downloaded once) |
| `.env`                   | DB + target API config (gitignored) |

## Password hashing

`seed-users.js` uses **BCrypt rounds=11** to match `Timeline.AuthService.LocalLoginAsync`, which calls `BCrypt.Net.BCrypt.Verify(password, user.Password)`.

Note: the BE also has `SecurityHelper.HashPassword` (PBKDF2) but it's not used by login — don't be fooled.

Re-running `seed-users.js` is **idempotent** — it `MERGE`s on email and restores `deleted_at = NULL` if the row was previously soft-deleted.

## Tuning the load profile

| Flag        | .env key     | Default | Meaning |
|-------------|--------------|---------|---------|
| `-Vus`      | `VUS`        | `1000`  | Peak concurrent virtual users |
| `-RampUp`   | `RAMP_UP`    | `2m`    | Time to reach peak |
| `-Steady`   | `STEADY`     | `5m`    | Hold at peak |
| `-RampDown` | `RAMP_DOWN`  | `1m`    | Cool down |
| `-BaseUrl`  | `LOADTEST_BASE_URL` | `http://localhost:5000` | Target |
| `-Seed`     | —            | off     | Seed users before test |
| `-Prewarm`  | —            | off     | Pre-warm tokens (needed for `-NoAuth`) |
| `-NoAuth`   | —            | off     | Use `scenario-noauth.js` |
| `-Cleanup`  | —            | off     | Soft-delete loadtest users after test |
| `-SkipTest` | —            | off     | Skip k6 (useful with `-Seed -SkipTest`) |

## Caveats

- **Don't run against production** — default targets localhost.
- **Single-machine ceiling** — ~2k–4k VUs on a typical laptop before the test box becomes the bottleneck.
- **JWT TTL is 15 min in dev / 60 min in prod**. Tests under that don't refresh.
- **Bcrypt rounds=11 is CPU-heavy by design** (~100ms each). 1000 simultaneous logins thrash the .NET thread pool — that's a real BE limit, not a toolkit bug. Use `-NoAuth` to measure non-login capacity.
- **`tree/v2` is skipped for fresh seeded users** — they have no workspaces. To stress that endpoint, also seed workspace data (out of scope here).

