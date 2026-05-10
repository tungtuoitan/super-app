---
description: Hard-delete one or more tasks and all related data via DELETE /api/task. Usage: /permanently-delete-task <bearer-token> <id1> [id2 ...]
argument-hint: <bearer-token> <task-id> [task-id ...]
---

Permanently hard-delete tasks from the SuperApp backend at http://localhost:5000.
This removes: ProTask rows, comments, checklist history, flow edges, node positions,
workspace folder + notes (hard delete), and keywords (HardDeletedAt).

## Arguments

`$ARGUMENTS` contains the bearer token followed by one or more task IDs separated by spaces.

Example: `eyJhbGc... 42 57 103`

If `$ARGUMENTS` is blank or has fewer than 2 tokens, print:
```
Usage: /permanently-delete-task <bearer-token> <task-id> [task-id ...]
Example: /permanently-delete-task eyJhbGc... 42 57
```
Then stop.

## Steps

1. Split `$ARGUMENTS` by whitespace. First token = bearer token, remaining tokens = task IDs (parse as integers).

2. Validate: all ID tokens must be positive integers. If any are invalid, report and stop.

3. Confirm before deleting — print:
   ```
   About to permanently delete task(s): <ids>
   This CANNOT be undone. Proceed? (the API call will be made immediately)
   ```

4. Run this PowerShell command:
```powershell
$parts  = "$ARGUMENTS" -split '\s+'
$token  = $parts[0]
$ids    = $parts[1..($parts.Length-1)] | ForEach-Object { [int]$_ }
$body   = @{ ids = $ids } | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/task" `
    -Method DELETE `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $body `
    -ErrorAction Stop
$response | ConvertTo-Json -Depth 3
```

5. Display result:
   - On success: "✅ Permanently deleted N task(s): [ids]"
   - On 400/404: show the error message from the response
   - On 401: "Unauthorized — check your bearer token"
   - On connection refused: "Cannot reach http://localhost:5000 — is the backend running?"
