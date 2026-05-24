# Workspace API Load Test

Stress test for `GET /api/workspace/{id}/tree/v2` — the endpoint flagged "POOR > 5000 items" in the BE. Clones real workspace data from `SuperApp-pro` (user `hoanhtungle@gmail.com`) into `SuperApp-dev` for every loadtest user, then hammers tree/v2.

## Prerequisites

- `loadtest/` folder set up first (`.env`, k6 binary, npm deps)
- BE running on `http://localhost:5000`
- DB user with read access to `SuperApp-pro` and write access to `SuperApp-dev`

## Quickstart

```powershell
cd C:\Users\Admin\source\SuperApp\test-workspace-api

# Full flow: seed users -> clone data -> prewarm tokens -> test -> cleanup
.\run.ps1 -Full -Cleanup

# Just run the test (data already cloned, tokens already warm)
.\run.ps1

# Re-clone before test (e.g. source data changed)
.\run.ps1 -Clone

# Custom load
.\run.ps1 -Vus 500 -RampUp 1m -Steady 2m -RampDown 30s
```

## What gets cloned

- `ws.workspaces` — all of `hoanhtungle@gmail.com`'s active workspaces (~20)
- `ws.workspace_items` — all items inside those workspaces (~333), with `parent_id` and `PathIds` remapped per cloned user

For 1000 loadtest users: ~20k workspaces + ~333k items. Clone takes ~1-2 minutes.

**Not cloned:** notes, tasks, knowledge bases. `workspace_items.entity_id` keeps pointing at the source user's entities. That's fine for stressing tree/v2 (which only queries flat workspace_items list with PathIds).

## Files

| File | Purpose |
|------|---------|
| `run.ps1`               | Orchestrator (calls loadtest seed → clone → prewarm → k6 → cleanup) |
| `clone-data.js`         | Reads pro DB, inserts cloned ws + items into dev with id/path remap |
| `cleanup-data.js`       | Deletes cloned ws (CASCADEs items) for loadtest users |
| `k6/scenario-tree.js`   | Each VU does `GET /workspace` once, then loops `GET /workspace/{id}/tree/v2` |

## Threshold

Test fails if p95 of tree/v2 > 3s or any endpoint fail > 5%.

## Caveats

- **Idempotent**: re-running `clone-data.js` clears prior clones first. Safe to run multiple times.
- **Resume mode**: `node clone-data.js --resume` skips users already fully cloned and only redoes partial ones. Use after a Ctrl+C or crash mid-clone.
- **Tokens path**: k6 v2 resolves `open()` relative to cwd, not script. Tokens must live at `test-workspace-api/results/tokens.json`. The runner copies them from `loadtest/results/` automatically; if running k6 manually, copy first.
- **Rate limit on login** (10 req/s/IP) means prewarm uses concurrency=8 with 429 retry. Prewarm 1000 tokens takes ~100s.
- **JWT TTL must be > test duration** — check `Timeline\.env` `Jwt__ExpirationMinutes`. Default 15 is enough for default ramp.
- **Don't run on prod DB.** Default cleanup pattern is `loadtest+%@test.local` — only deletes data owned by users matching that email pattern.

## Real-data baseline (2026-05-24)

With 1000 loadtest users × 20 ws × ~16 items each (333k items total):
- 200 VUs: 24 req/s, p95 19s, **0% fail** — queues but holds
- 1000 VUs: 26 req/s, p95 60s (timeout), **20% fail** — hard ceiling

`tree/v2` is the heaviest endpoint by ~28× vs light reads. Avg payload 600KB. Sustained ceiling ~25 req/s per BE instance.
