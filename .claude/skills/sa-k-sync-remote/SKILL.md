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
- `Components/KMarkdownEditorTab.tsx` — markdown tab editor, save flow gửi context + directives
- `Components/KDailyReviewSession/KDailyReviewSession.tsx` — review UI hiển thị context với Shiki
- `Components/KQList.tsx` — question list với attachment chip + link picker
- `Components/KDialog.tsx` — node dialog với attachment section ở edit mode
- `store/kRepoSync.store.ts` — zustand store
- `types/kRepoSync.type.ts`, `types/kAttachment.type.ts`, `types/kQuiz.type.ts` (KQuestion + KDailySessionQuestion có `context`)
- `utils/kMarkdownEditor.utils.ts` — parseMarkdown / buildMarkdown / formatMarkdown / validateMarkdown
- `utils/shikiHighlighter.ts` — getShikiHighlighter / SHIKI_THEME / resolveLang
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

Mỗi `.md` có front-matter `id` + `name` (id link tới DB entity). Body: heading `# <Q> [id:N order:M atts:1,2,3 open-context]` + (optional context code block) + answer. Draft block: `<!--# <Q> [id:N order:M] ... -->`.

**Format `.md` cho question có context**:
```markdown
# Question A [id:5 order:1 open-context]
```python
# code context — hiển thị cùng câu hỏi khi review
def foo():
    return 1
```

Answer text here

# Question B [id:6 order:2]
Answer B — kế thừa context của A do cùng scope

# Question C [id:7 order:3 close-context]
Answer C — kế thừa và đóng scope (inclusive)

# Question D [id:8 order:4]
Answer D — KHÔNG kế thừa
```

- **Owned context**: code block ngay sau heading (trước answer). Parser detect leading fence → context, không phải answer.
- **Scope inheritance**: `open-context` + `close-context` PHẢI đi theo cặp. `open-context` đơn lẻ (không có `close-context` bên dưới) = vô nghĩa — context chỉ thuộc về chính câu đó. Khi đủ cặp: tất cả question giữa opener và closer (inclusive) kế thừa context string (denormalized — copy vào `q.context`, không FK). Rules validity:
  1. Phải có `close-context` bên dưới trong cùng file/node
  2. Không có question nào bên trong mang context riêng (sẽ invalidate scope)
  3. Không có `open-context`/`close-context` lồng nhau bên trong scope
  Implemented bởi `FindValidScopeOpenerIndices<T>` (generic helper, dùng cả BE lẫn FE).
- **Directives**: flag-only tokens trong bracket tag (không có `:`) — e.g. `open-context`, `close-context`. Lưu DB dạng JSON array `["open-context"]` trong `k.question.directives nvarchar(max)`.
- Code blocks bên trong answer (không phải leading) vẫn được track qua `inCodeBlock` state để `# comment` / `-->` bên trong không bị parse nhầm thành heading/draft-close.

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

OldText/NewText format — **thứ tự: question > directives > context > answer**:
- `repo_only` / `db_only`: `<question>\ndirectives: ...\ncontext:\n...\n<answer>`; scope children thay context bằng `[inherits context]`
- `modified`: `[active|draft] <question>\ndirectives: ...\ncontext:\n...\n<answer>`; cross-node move append `\nin: <nodeName>`; att changes append `\natts: [...]`
- Attachment modified: full content (DB trước, repo sau)

**LibGit2Sharp gotcha**: `Tree` object không thread-safe sau `await`. Phải gọi `WalkMdFiles` + `WalkAllFiles` (cho `Example/`) **trước first await** trong `GetCompareDiffAsync` rồi cache vào dictionary, không gọi lại sau khi đã `await` thứ gì đó.

## Context field (`k.question.context` + directives scope)

**Schema** (updated 2026-06-27, migration `add_context_to_k_question.sql`):
- `k.question.context nvarchar(max) NULL` — owned context code snippet (denormalized — scope children get a copy)
- `k.question.directives nvarchar(max) NULL` — JSON array of directive strings e.g. `["open-context"]`, `["close-context"]`

**Directives**: flag-only tokens in bracket tag (no colon). Currently supported:
- `open-context` — marks a question as context scope opener; its `context` block is the scope source
- `close-context` — last question in scope (inclusive); questions after this do NOT inherit

**Scope resolution** (happens at parse time, both BE and FE):
After `Flush()` collects all questions from a file, a second pass walks the list:
1. `FindValidScopeOpenerIndices` pre-computes which openers form a valid pair (no closer = invalid, inner question with own context = invalid, nested directives = invalid)
2. For each valid opener with non-empty context → set `scopeContext`, enter scope
3. For each following question with no owned context: copy `scopeContext` into `q.Context`
4. On question with `close-context`: copy context then exit scope
5. Invalid opener → context stays private to that question, scope NOT entered

**Storage**: context is **denormalized** — inherited questions get the full context string copied into their own `context` column. No FK at query time. If opener's code is edited, re-sync copies the new value to all children.

**Markdown parser/builder** (`KRepoSyncService.cs` lines ~1724-1870):
- `ParseQuestions` state: `bool inContext`, `string? context`, `IReadOnlyList<string> directives`. Context detection PHẢI check trước `inCodeBlock` toggle.
- Scope resolution pass runs after main parse loop.
- `ExtractMeta`: flag tokens (no colon) → `directives` list. Key:val tokens → `id`/`order`/`atts` as before. `getctx` removed.
- `BuildRepoMarkdown`: emits directives as space-separated flag tokens inside bracket: `[id:5 order:1 open-context atts:1,2]`. `DeserializeDirectives(q.Directives)` reads from DB.
- `QuestionsEqual`: compares context strings (not directives — directives change only causes a rebuild, not a conflict flag).

**FE markdown editor** (`kMarkdownEditor.utils.ts`):
- `ParsedQuestion` interface has `context: string | null`, `directives: string[]` (not `contextQuestionId`).
- `parseMetadata` returns both `meta` (key:val) and `directives` (flag tokens). Regex: `(?<!\w)([a-z][a-z-]+[a-z])(?!\s*:)(?=[\s\]])`.
- `buildMarkdown` emits directives after `order:N` in tag, before `atts:`.
- `parseMarkdown` runs same scope resolution pass as BE.
- `KMarkdownEditorTab.tsx` save flow sends `directives` (not `contextQuestionId`). Dirty-check includes `JSON.stringify(directives)` comparison.

**List endpoints**: trả raw `q.Context` + `q.Directives` — markdown editor cần round-trip đúng.
**Daily-session endpoints**: chạy `BuildScopeContextMap` tại query time (group by NodeId → scope resolution per node) để scope children nhận context kể cả khi Apply chưa denormalize (e.g. opener là draft → `q.Context` null trong DB). Fallback cho draft opener: nếu `q.Context` null dùng `q.Description` (code block đã leak vào đó).

**Compare diff** (`GetCompareDiffAsync`): append `\ndirectives: open-context, close-context` nếu có — user thấy đầy đủ bối cảnh.

**FE Daily Review UI** (`KDailyReviewSession.tsx`):
- Shiki highlight context (reuse `getShikiHighlighter`, `SHIKI_THEME` từ `KAttachmentViewerDialog`). Detect language từ opening fence `\`\`\`<lang>`.
- Context block hiển thị giữa attachment pills và answer box. Hiển thị LUÔN (không fade khi reveal answer — user xem cả context lẫn answer cùng lúc).
- `overflow-auto` (cả ngang lẫn dọc) + `[&_pre]:min-w-max [&_pre]:m-0` để Shiki bg phủ toàn bộ vùng scrollable khi code dài.
- Trên mobile: score buttons + scoreMode toggle ẨN — chỉ dùng ball gesture để có không gian cho context + answer.

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
- **Draft opener context not preserved on Apply**: draft parser never extracts context (code block goes into `answer`), so `pq.Context == null`. Apply flow uses `effectiveContext = pq.IsDraft ? q.Context : pq.Context` to preserve existing DB context. `QuestionsEqual` also skips context comparison for drafts (`|| repoDraft`) to avoid false "modified" entries. Compare diff display uses `repoDisplayContext = dbQ.Context` fallback for draft openers.
- **Daily session scope resolution**: `BuildScopeContextMap` runs at query time (per node, ordered by SortOrder) — do NOT rely solely on denormalized `q.Context` at session time. Draft opener fallback: `q.Context ?? q.Description` (draft parser leaks context into Description).
- **`getctx:` chỉ accept numeric ID** (int question id). Filename ref không hỗ trợ — chỉ dùng cho question→question reference.
- **Context detection PHẢI check trước `inCodeBlock` toggle** trong `ParseQuestions`: nếu line là opening fence và đây là leading block (`answer` còn trống) → vào `inContext` mode. Nếu xử lý `inCodeBlock = !inCodeBlock` trước thì code block bị hút vào answer, context luôn null.
- **Scope resolution pass** chạy SAU main parse loop — không làm trong-loop vì cần biết toàn bộ danh sách trước.
- **Directives là flag tokens** (không có `:`) trong bracket. `ExtractMeta` regex `(\w[\w-]*):([^\s\]]+)` cho key:val; regex riêng `(?<!\w)([a-z][a-z-]+[a-z])(?!\s*:)(?=[\s\]])` cho directives. FE và BE phải đồng bộ cùng regex.
- **Context denormalized**: children nhận bản copy của opener's context string. Không có FK runtime. Nếu opener thay đổi context → phải re-sync để update children.
- **List endpoints trả raw `Context` + `Directives`** — không resolve, vì markdown editor cần biết owned vs scope. Daily-session endpoints trả `q.Context` trực tiếp (đã denormalized tại Apply).
- **Daily review hiển thị context LUÔN** (không fade khi reveal answer) — user xem context lẫn answer cùng lúc. Mobile ẩn score buttons + scoreMode toggle, chỉ dùng ball gesture.

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
10. Context detection ở `ParseQuestions` PHẢI nằm trước `inCodeBlock` toggle
11. Scope resolution pass chạy SAU main parse loop (không trong-loop)
12. Cả BE (`KRepoSyncService.cs`) và FE (`kMarkdownEditor.utils.ts`) parser/builder/scope phải đồng bộ — round-trip qua cả 2 phải bằng nhau
13. List endpoints trả raw `Context` + `Directives`; daily endpoints trả `Context` trực tiếp (denormalized)
14. Có test cover ở `SuperAppServices.Tests/KRepoMarkdownRoundTripTests.cs` — chạy `dotnet test` sau khi sửa parser/builder
