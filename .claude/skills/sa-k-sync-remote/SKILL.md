---
name: sa-k-sync-remote
description: Architecture và flow của K repo sync trong SuperApp — đồng bộ 2 chiều giữa DB (source of truth) và git remote repo qua KRepoSyncService, KRepoSyncDaemon, KRepoSyncBackgroundService và IKViewerTracker. TRIGGER khi user làm việc với feature K repo sync, sửa KRepoSyncService.cs, KRepoSyncDaemon, SettingsDialog phần "K Repo Sync", popup Review Changes (KRepoConflictDialog), hoặc hỏi về sync DB ↔ remote, force-push, conflict resolution, soft-delete khi Apply, viewer tracker. Đọc skill này TRƯỚC KHI sửa bất kỳ phần nào liên quan để hiểu cả 2 path (daemon vs Apply) và các invariant.
---

# sa-k-sync-remote

K module sync DB ↔ git remote 2 chiều. **DB là source of truth**, remote là mirror dùng cho git review/diff/edit text. Markdown round-trip an toàn nhờ tag `[id:N order:M]` ở mỗi heading + front-matter `id` ở mỗi `.md`.

## Files chính

**BE (`C:\Users\Admin\source\Timeline`):**
- `SuperAppServices/Services/K/KRepoSyncService.cs` — service chính (~1700 dòng)
- `SuperAppServices/Services/K/KRepoSyncPlanner.cs` — pure planner: so repo files vs DB → ReconcilePlan
- `SuperAppAPI/BackgroundServices/KRepoSyncDaemon.cs` — event-driven, debounce 5s
- `SuperAppAPI/BackgroundServices/KRepoSyncBackgroundService.cs` — periodic 10min check / 1h push
- `SuperAppAPI/Hubs/KSyncHub.cs` — SignalR hub + `SignalRKSyncNotifier`
- `SuperAppAPI/Hubs/KViewerTracker.cs` — singleton, dict per-user → set connection ids
- `SuperAppAPI/Controllers/K/KRepoSyncController.cs` — REST endpoints
- `SuperAppServices/Interfaces/K/IKSyncNotifier.cs`, `IKViewerTracker.cs`, `IKRepoSyncService.cs`

**FE (`C:\Users\Admin\source\SuperApp\src\features\K`):**
- `service/kRepoSync.service.ts` — fetch wrappers
- `hooks/useKRepoSyncRealtime.headless.ts` — SignalR connect + `notifyViewing("start"|"stop")`
- `Components/small/KRepoConflictDialog.tsx` — popup Review Changes
- `Components/small/KRepoDiffPanel.tsx` — diff panel cũ (per-question)
- `store/kRepoSync.store.ts` — zustand store
- `types/kRepoSync.type.ts`
- Shell: `src/shell/components/SettingsDialog.tsx` (UI K Repo Sync section)

## Layout repo

```
Knowledge/
  <KName>/             ← knowledge LUÔN là folder
    _.md               ← knowledge self file (BUỘC)
    <Leaf>.md          ← node lá
    <NonLeaf>/         ← node có con
      <NonLeaf>.md     ← self file (tên TRÙNG folder)
      <Child>.md
```

Mỗi `.md` có front-matter `id` + `name` (id link tới DB entity). Body: heading `# <Q> [id:N order:M]` + answer. Draft block: `<!--# <Q> [id:N order:M] ... -->`.

## Hai đường push DB → remote (cả 2 phải skip khi viewing)

1. **Event-driven**: API mutate K → `IKSyncEventPublisher` → `KRepoSyncDaemon` debounce 5s → `ForceUpdateRemoteAsync` (force, ignore remote, overwrite từ DB)
2. **Periodic**: `KRepoSyncBackgroundService`:
   - Mỗi 10 phút → `CheckAllUsersAsync(viewerTracker)` → fetch remote, set `KRepoStatusCode = "behind"` nếu sha khác
   - Mỗi 1 giờ → `PushAllUsersAsync(viewerTracker)` → `DoPushAsync` (hash short-circuit)

Cả 2 đều check `IKViewerTracker.IsViewing(userId)` để skip khi user mở popup Review Changes.

## Một đường remote → DB

`PullFromRepoAsync` hoặc `ResolveConflictsAsync` → `DoApplyRemoteChangesAsync(profile, userId, softDeleteUnclaimed)`:
- Walk all `.md` files trong remote tree
- `KRepoSyncPlanner.Plan(...)` ra `ReconcilePlan` (pure)
- Apply: knowledges create/rename → nodes create/rename/move → questions create/update/move/draft-toggle → questions delete (chỉ khi node parent vẫn còn nhưng heading bị xóa khỏi `.md`)
- Cuối hàm: `DoPushAsync(force: true)` để mirror DB lên remote sau khi reconcile

## softDeleteUnclaimed — khác biệt giữa daemon path và Apply

`DoApplyRemoteChangesAsync(... softDeleteUnclaimed: bool)`:

- **`false`** (daemon path / `PullFromRepoAsync`): unclaimed knowledge/node = entity DB không có trong repo → **giữ lại trong DB**, force-push restore lên remote (DB-wins). User xóa file trên remote bằng tay sẽ được restore.
- **`true`** (chỉ `ResolveConflictsAsync` từ popup): user đã review explicit → **soft-delete** entity (set `DeletedAt = now`) + cascade descendants (qua `PathIds`) + cascade nodes thuộc deleted knowledges + soft-delete questions của victim nodes.

Cascade descendant qua `PathIds` (format `/{rootId}/.../{selfId}/`) **làm in-memory trên `dbNodes` đã load**, không query EF (vì EF không translate được `string.Format`/interpolation trong `.Contains()`).

## IKViewerTracker (singleton)

Track per-user → set of SignalR connection ids đang xem popup Review Changes.

Hub methods:
- `StartViewing()` — FE gọi khi `reviewOpen = true` → `tracker.StartViewing(userId, ConnectionId)`
- `StopViewing()` — FE gọi khi đóng popup
- `OnDisconnectedAsync` — fallback cleanup khi user đóng tab

FE invoke qua `notifyViewing("start"|"stop")` trong `useEffect([reviewOpen])` của `SettingsDialog`. Connection được lưu module-level trong `useKRepoSyncRealtime.headless.ts` để non-React caller reach được.

Nếu SignalR down → `notifyViewing` swallow error, daemon hoạt động như cũ (best-effort).

## Compare diff (`GetCompareDiffAsync`)

So sánh remote (latest fetched) vs DB hiện tại, không write. Trả `KRepoCompareEntry[]` với `changeType`:
- `repo_only` — chỉ có ở remote (sẽ tạo trong DB khi Apply)
- `db_only` — chỉ có ở DB (Apply: soft-delete; Daemon: keep + push back)
- `modified` — ở 2 bên nhưng khác. Cho **node**: name / knowledge / parent thay đổi. Cho **question**: name/desc/draft / NodeId thay đổi (move giữa nodes). Resolve qua `folderToKnowledgeIdCmp` / `folderToNodeIdCmp` để chỉ flag khi target id resolve được trong DB (tránh false positive).

OldText/NewText format:
- Node modified: `<name>\nin: <Knowledge / Parent>` (cả 2 bên cùng shape)
- Question modified: `[active|draft] <body>`, nếu cross-node move append `\nin: <nodeName>`

## Apply flow trong popup (`KRepoConflictDialog`)

Items chỉ chứa `modified` entries (cần chỉ định "bên nào thắng"). `repo_only` / `db_only` KHÔNG gửi item — reconcile tự xử lý:
- `repo_only` → tạo entity mới khi reconcile (no item needed, chưa có dbId)
- `db_only` → soft-delete khi `softDeleteUnclaimed=true`

Items rỗng `[]` cũng hợp lệ (BE đã bỏ check `items.Count == 0`). Reconcile vẫn chạy.

## Force=true ở DoPushAsync (cuối DoApplyRemoteChangesAsync)

`DoPushAsync` có hash short-circuit: `if (!force && newHash == profile.KRepoContentHash) return "No changes"`. Hash chỉ track DB content, không biết remote state.

→ User xóa file remote → DB không đổi → hash giống → không push → remote vẫn trống. Fix: cuối `DoApplyRemoteChangesAsync` luôn `DoPushAsync(profile, force: true)` để bypass shortcut.

## Status codes

`KRepoStatusCode` (in DB `UserProfile.KRepoStatusCode`): `idle | synced | checking | pushing | pulling | behind | conflict | error`. SignalR push real-time qua `UpdateSyncStatus` event với `KSyncStatusMessage { status, message, direction }`.

`StatusCode` của node mới tạo từ Apply: **luôn `"draft"`** (per user request, line ~990 KRepoSyncService.cs).

## Logging summaries

Hai loại summary log:

1. **`Reconcile summary ({Mode})`** — in cuối `DoApplyRemoteChangesAsync`. Mode = `"Apply"` (softDeleteUnclaimed=true) hoặc `"Daemon"`. Đếm: knowledges[+created ~renamed -deleted], nodes[+ ~ -], questions[+ ~ ↔moved draft↻ -repoDeletes/-cascadeDeletes].
2. **`ForceUpdate summary`** — in trong `DoForceUpdateRemoteAsync`. File-level diff: `[+added ~modified -deleted =unchanged]` so với existing repo files trước khi clear.

Daemon path (web edit → save) đi qua `DoForceUpdateRemoteAsync`, không qua reconcile → chỉ có file-level summary, không có entity-level.

## Gotchas đã gặp

- **EF không translate `n.PathIds.Contains($"/{id}/")`** — phải làm in-memory.
- **Pull-before-push fence** trong `DoPushAsync` dùng `MergeFileFavor.Ours` để DB-wins khi merge conflict.
- **Windows pending deletion**: sau khi `Pull` xóa dir, `CreateDirectory` cùng path có thể fail. Fix bằng cách chỉ delete files (không delete dir), để git Stage("*") detect deletion.
- **`KKnowledgeRepository.GetKnowledgeTreeAsync`** load tất cả nodes của 1 knowledge (dùng trong `DoPushAsync` để build fileMap). Không dùng `dbNodes` snapshot vì cần `KNode.Description` etc.
- **Folder/file naming**: clean (không có id), id ở front-matter. Sibling unique qua `MakeUnique` (suffix ` (2)`, ` (3)`...). `Sanitize` strip `\ / : * ? " < > |`.
- **Knowledge self file**: `Knowledge/<K>/_.md` (literal `_`). Non-leaf node self file: `Folder/<Folder>.md` (cùng tên).

## Endpoints

- `GET  /api/k/repo-sync/status` — current config + status
- `POST /api/k/repo-sync/config` — save repoUrl/branch/PAT
- `POST /api/k/repo-sync/push` — explicit push (force=true)
- `POST /api/k/repo-sync/pull` — pull remote → DB (softDeleteUnclaimed=false)
- `POST /api/k/repo-sync/force-update` — force overwrite remote with DB
- `GET  /api/k/repo-sync/diff` — last-push-vs-HEAD diff (per-question)
- `GET  /api/k/repo-sync/compare` — current remote vs DB compare
- `POST /api/k/repo-sync/resolve-conflicts` — Apply (softDeleteUnclaimed=true). Items có thể `[]`.
- `POST /api/k/repo-sync/retry` — clear conflict status, retry push

## Khi sửa, kiểm tra:

1. Cả `DoApplyRemoteChangesAsync` (param `softDeleteUnclaimed`) — daemon path + Apply path đều OK
2. Tracker skip ở 3 chỗ: `KRepoSyncDaemon.RunSyncAsync` (×2 trước/sau semaphore), `CheckAllUsersAsync`, `PushAllUsersAsync`
3. Force-push ở cuối reconcile, không bỏ
4. FE `notifyViewing` start/stop khớp với `reviewOpen` lifecycle
5. Compare diff resolve qua `folderToKnowledgeIdCmp` / `folderToNodeIdCmp` trước khi flag `modified` (move detection)
