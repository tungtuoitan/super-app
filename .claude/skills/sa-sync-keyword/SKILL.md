---
name: sa-sync-keyword
description: Sync all keywords for a user via POST /api/keyword/sync. Usage: /sync-keyword <bearer-token>
---

Call the keyword sync API for the SuperApp backend running at http://localhost:5000.

## Arguments

`$ARGUMENTS` is the bearer token. If empty, tell the user: "Usage: /sync-keyword <bearer-token>"

## Steps

1. Parse the bearer token from `$ARGUMENTS`. If blank, print usage and stop.

2. Run this PowerShell command:
```powershell
$token = "$ARGUMENTS"
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/keyword/sync" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
    -ErrorAction Stop
$response | ConvertTo-Json -Depth 5
```

3. Display the result as a clean summary:
   - Total keywords
   - Created count
   - Updated count  
   - Hard-deleted count
   - Name mismatch count / Link mismatch count
   - If `created` or `updates` arrays are non-empty, list them (id, type, name)

4. If the call fails (401, 500, connection refused), show the error clearly.
