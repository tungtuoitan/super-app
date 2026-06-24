---
name: sa-k-sync-remote
description: Architecture và flow của K repo sync trong SuperApp — đồng bộ 2 chiều giữa DB (source of truth) và git remote repo qua KRepoSyncService, KRepoSyncDaemon, KRepoSyncBackgroundService và IKViewerTracker. Bao gồm cả attachments (Example/ folder, k.attachment + k.attachment_link, atts: tag). TRIGGER khi user làm việc với feature K repo sync, sửa KRepoSyncService.cs, KRepoSyncDaemon, KAttachmentService, SettingsDialog phần "K Repo Sync", popup Review Changes (KRepoConflictDialog), KAttachmentViewerDialog, hoặc hỏi về sync DB ↔ remote, force-push, conflict resolution, soft-delete khi Apply, viewer tracker, attachments (link/unlink, atts: tag, Example/ folder, filename↔id resolve). Đọc skill này TRƯỚC KHI sửa bất kỳ phần nào liên quan để hiểu cả 2 path (daemon vs Apply) và các invariant.
---

# sa-k-sync-remote

K module sync DB ↔ git remote 2 chiều. **DB là source of truth**, remote là mirror dùng cho git review/diff/edit text. Markdown round-trip an toàn nhờ tag `[id:N order:M]` ở mỗi heading + front-matter `id` ở mỗi `.md`.

## Files chính

**BE (`C:\Users\Admin\source\Timeline`):**
- `SuperAppServices/Services/K/KRepoSyncService.cs` — service chính (~2200 dòng)
- `SuperAppServices/Services/K/KRepoSyncPlanner.cs` — pure planner: so repo files vs DB → ReconcilePlan
- `SuperAppServices/Services/K/KAttachmentService.cs` — CRUD + link/unlink attachments
- `SuperAppAPI/BackgroundServices/KRepoSyncDaemon.cs` — event-driven, debounce 5s
- `SuperAppAPI/BackgroundServices/KRepoSyncBackgroundService.cs` — periodic 10min check / 1h push
- `SuperAppAPI/Hubs/KSyncHub.cs` — SignalR hub + `SignalRKSyncNotifier`
- `SuperAppAPI/Hubs/KViewerTracker.cs` — singleton, dict per-user → set connection ids
- `SuperAppAPI/Controllers/K/KRepoSyncController.cs` — REST endpoints
- `SuperAppAPI/Controllers/K/KAttachmentController.cs` — attachment endpoints
- `SuperAppServices/Interfaces/K/IKSyncNotifier.cs`, `IKViewerTracker.cs`, `IKRepoSyncService.cs`

**FE (`C:\Users\Admin\source\SuperApp\src\features\K`):**
- `service/kRepoSync.service.ts` — fetch wrappers
- `service/kAttachment.service.ts` — attachment CRUD + link/unlink
- `hooks/useKRepoSyncRealtime.headless.ts` — SignalR connect + `notifyViewing("start"|"stop")`
- `Components/small/KRepoConflictDialog.tsx` — popup Review Changes
- `Components/small/KRepoDiffPanel.tsx` — diff panel cũ (per-question)
- `Components/small/KAttachmentViewerDialog.tsx` — Monaco read-only popup khi click attachment
- `Components/KQList.tsx` — question list với attachment chip + link picker
- `Components/KDialog.tsx` — node dialog với attachment section ở edit mode
- `store/kRepoSync.store.ts` — zustand store
- `types/kRepoSync.type.ts`, `types/kAttachment.type.ts`
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
Example/               ← attachments (1 file = 1 row k.attachment)
  <title>              ← e.g. case1.cs, snippet.py — flat, no subfolders
  ...
```

Mỗi `.md` có front-matter `id` + `name` (id link tới DB entity). Body: heading `# <Q> [id:N order:M atts:1,2,3]` + answer. Draft block: `<!--# <Q> [id:N order:M] ... -->`.

Mỗi file trong `Example/` có dòng đầu là metadata comment kiểu language-aware:
- `// att-id:5 title:"case1.cs"` (cs/js/ts/...)
- `# att-id:5 title:"case1.py"` (py/rb/sh)
- `<!-- att-id:5 title:"case1.html" -->` (html/xml/md)

Body từ dòng 2 trở đi là code thật. Khi push từ DB, BE tự thêm dòng meta. Khi user tạo file mới (chưa có id), BE assign id ở Apply rồi DoPush rewrite file với meta comment.

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
- `modified` — ở 2 bên nhưng khác. Cho **node**: name / knowledge / parent thay đổi. Cho **question**: name/desc/draft / NodeId thay đổi (move giữa nodes) / **att-links thay đổi** (so bằng `SetEquals` của resolved att ids — bắt cả 2 chiều). Cho **attachment**: title hoặc content thay đổi. Resolve qua `folderToKnowledgeIdCmp` / `folderToNodeIdCmp` / `titleToAttIdCmp` để chỉ flag khi target id resolve được trong DB (tránh false positive).

`entityType` của entry: `"knowledge" | "node" | "question" | "attachment"`.

OldText/NewText format:
- Node modified: `<name>\nin: <Knowledge / Parent>` (cả 2 bên cùng shape)
- Question modified: `[active|draft] <body>`, nếu cross-node move append `\nin: <nodeName>`, nếu atts thay đổi append `\natts: [<refs>]` (repo show as-written, kể cả filename refs)
- Attachment modified: full content (DB trước, repo sau)

**LibGit2Sharp gotcha**: `Tree` object không thread-safe sau `await`. Phải gọi `WalkMdFiles` + `WalkAllFiles` (cho `Example/`) **trước first await** trong `GetCompareDiffAsync` rồi cache vào dictionary, không gọi lại sau khi đã `await` thứ gì đó.

## Attachments (Example/ folder)

**Schema (`k.attachment` + `k.attachment_link`)**:
- `k.attachment(id, user_id, title, type, language, content nvarchar(max), sort_order, created_at, updated_at, deleted_at)` — `content` là `nvarchar(max)` (KHÔNG dùng `text` vì non-Unicode → mất tiếng Việt)
- `k.attachment_link(attachment_id, entity_type, entity_id, created_at)` — link N-N giữa attachment ↔ question/node. `entity_type` ∈ `{question, node}`.

**Tag `atts:` trong heading**: `# Q [id:5 order:1 atts:1,2,case3.cs]`. Mỗi ref là **string raw**:
- Numeric → att id trực tiếp
- Filename → resolve qua `titleToAttachmentId` (full title `case1.cs` HOẶC basename `case1` đều match)

`ExtractMeta` regex: `(\w+):([^\s\]]+)` — KHÔNG dùng `\S+` vì sẽ ăn cả `]` cuối bracket khi `atts:` là key cuối.

**Round-trip filename → id**:
1. User tạo file `Example/case1.cs` (chưa có id) + sửa heading thêm `atts:case1` (hoặc `atts:case1.cs`)
2. Apply step 1b: walk `Example/`, upsert mỗi file → assign id, register cả full title + basename vào `titleToAttachmentId`
3. Apply step 7: walk `plan.Questions`, với mỗi `attRef`:
   - `int.TryParse(ref)` → numeric id
   - else `titleToAttachmentId.TryGetValue(ref)` → resolved id
   - Skip nếu không resolve được hoặc att không tồn tại
   - Insert `k.attachment_link` nếu chưa có
4. Cuối Apply: `DoPushAsync(force: true)` → `BuildRepoMarkdown` rewrite heading thành `atts:1` (numeric, từ DB). Tag filename biến thành tag id ở next pull.

**Apply behavior với attachments**:
- File mới (chưa có meta) → tạo row mới, `RegisterAttTitle` thêm vào claimed set
- File có `att-id:N` ở dòng đầu → update existing row (`Title`, `Content`, `Language`, `UpdatedAt`)
- File rename trên remote → khi user sửa filename, dòng `att-id:N` vẫn giữ → BE update `Title` theo filename mới
- File xoá / xoá folder `Example/` → att không nằm trong `claimedAttIds` → khi `softDeleteUnclaimed=true`: soft-delete; khi false: keep + DoPush sẽ ghi lại file

**`DoPushAsync` build `Example/`**: load `KAttachmentLinks` per question + `BuildRepoMarkdown(active, attsByQ)` để emit `atts:` tag. Nếu pass `null` → tag bị mất → next compare diff sẽ thấy att-link change. Lỗi này từng xảy ra ở `DoForceUpdateRemoteAsync` — đã fix.

**`KAttachmentService` (FE)** endpoints: `GET /api/k/attachments`, `GET /api/k/attachments/node/{nodeId}`, `POST/DELETE /api/k/attachments/question/{qid}/{aid}`, `POST/DELETE /api/k/attachments/node/{nid}/{aid}`. Link/unlink chỉ ghi `k.attachment_link` row, không touch markdown — markdown rebuild ở next push.

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
- **LibGit2Sharp tree không thread-safe sau `await`** — đọc tree (WalkMdFiles, WalkAllFiles) phải xảy ra trước first await trong cùng method, cache vào dict rồi dùng.
- **`k.attachment.content` phải là `nvarchar(max)` không phải `text`** — `text` non-Unicode → tiếng Việt thành `?????`. Configuration ở `KAttachmentConfiguration.cs`.
- **`atts:` regex bug**: dùng `\S+` ăn cả `]` cuối bracket khi atts là key cuối → val `"2]"` → parse fail → att bị drop. Fix: `[^\s\]]+`.
- **Filename ref resolve cả full title và basename** — register `case1.cs` + `case1` cùng map về 1 id (`RegisterAttTitle` helper). Edge case: 2 file cùng basename khác extension → basename chỉ map về file đầu tiên.
- **`BuildRepoMarkdown` MUST nhận `attsByQ`**: cả `DoPushAsync` và `DoForceUpdateRemoteAsync` phải load `KAttachmentLinks` rồi pass vào, không thì `atts:` tag bị drop khi push.
- **`atts:` chỉ accept `atts` không accept `att`** (singular là typo) — quyết định tránh drift.

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
5. Compare diff resolve qua `folderToKnowledgeIdCmp` / `folderToNodeIdCmp` / `titleToAttIdCmp` trước khi flag `modified` (move detection + att-link detection)
6. **Đọc tree (WalkMdFiles, WalkAllFiles) trước first await** trong cùng method — LibGit2Sharp tree không thread-safe sau await
7. **`BuildRepoMarkdown` luôn pass `attsByQ`** — cả `DoPushAsync` và `DoForceUpdateRemoteAsync`
8. Att-ref resolve hỗ trợ cả full title và basename (`RegisterAttTitle` helper)
9. Chỉ check key `atts` (plural) — KHÔNG accept `att`
10. Có test cover ở `SuperAppServices.Tests/KRepoAttachmentRoundTripTests.cs` — chạy `dotnet test` sau khi sửa parser/builder
