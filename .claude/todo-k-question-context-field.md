# Todo: Thêm field `context` vào k_question

## BE — Database

- [ ] Tạo file `add_context_to_k_question.sql` trong `SuperAppDataRepositories\Migrations\`
  - `ALTER TABLE k.question ADD context NVARCHAR(MAX) NULL` (idempotent với IF NOT EXISTS)
  - `ALTER TABLE k.question ADD context_question_id INT NULL` với FK reference `k.question(id)`

## BE — Entity & Config

- [ ] `SuperAppModels\Models\K\KQuestionEntity.cs` — thêm `public string? Context { get; set; }` và `public int? ContextQuestionId { get; set; }`
- [ ] `SuperAppDataRepositories\Data\Configurations\KQuestionConfiguration.cs` — map cả 2 columns

## BE — DTOs & Service

- [ ] `SuperAppModels\DTOs\Responses\KDailyReviewResponse.cs` — thêm `Context` (resolved string) vào `KDailySessionQuestionResponse`
- [ ] Tìm và thêm `Context` vào `KNodeQuestionResponse` — response của `GET /api/k/{nodeId}/node-questions`
- [ ] Tìm request DTO của `PATCH /api/k/{nodeId}/questions` (upsert) — thêm `Context` và `ContextQuestionId`
- [ ] `SuperAppServices\Services\K\KQuestionService.cs` — resolve context trong `GetDailySessionAsync`:
  - Nếu có `ContextQuestionId` → lấy context từ question đó
  - Else dùng `q.Context`
  - Load context sources trong 1 query để tránh N+1
- [ ] `KQuestionService.cs` — tương tự cho `GetNodeQuestionsAsync`
- [ ] `KQuestionService.cs` — nhận và save `Context` + `ContextQuestionId` trong upsert handler

## BE — Markdown Sync

- [ ] `SuperAppServices\Services\K\KRepoSyncPlanner.cs` — thêm `string? Context = null` và `int? ContextQuestionId = null` vào `ParsedQuestion` record
- [ ] `KRepoSyncService.cs` — `BuildRepoMarkdown`:
  - Nếu question có `Context` → write `{q.Context.Trim()}\n\n` trước description (code block tự nhiên, không cần label)
  - Nếu question có `ContextQuestionId` (và không có owned context) → write `getctx:{id}` vào bracket tag
- [ ] `KRepoSyncService.cs` — `ParseQuestions`: parse context từ leading code block
  - Sau heading, nếu dòng đầu tiên không trống là opening fence (` ``` `/`~~~`) → vào `inContext` mode
  - Accumulate vào `context` buffer (bao gồm cả dòng fence)
  - Gặp closing fence → `inContext = false`, kết thúc context
  - Phần còn lại (sau blank line tiếp theo) là answer
  - Parse `getctx:N` trong `ExtractMeta` (tương tự `atts:`)
  - Reset `context/inContext` trong `Flush()`
- [ ] `KRepoSyncService.cs` — `DoApplyRemoteChangesAsync`: map `parsed.Context` → `q.Context` và `parsed.ContextQuestionId` → `q.ContextQuestionId`

## BE — Tests

- [ ] `KRepoMarkdownRoundTripTests.cs` — thêm test `RoundTrip_ownedContext_preservedOnRoundTrip`
  - DB question có `Context` → build → parse → equal (context không lẫn vào answer)
- [ ] Thêm test `Parser_contextSection_doesNotLeakIntoAnswer`
  - Lines trong `context:` section không xuất hiện trong `parsed.Answer`
- [ ] Thêm test `Parser_noContext_backwardCompatible`
  - Question không có `context:` → `parsed.Context` null, answer không đổi
- [ ] Thêm test `Parser_contextWithHashComment_notTreatedAsHeading`
  - `# bash comment` trong context code block không tạo heading mới
- [ ] Thêm test `RoundTrip_borrowedContext_getctxTagRoundTrips`
  - Question với `ContextQuestionId = 5` → build → parse → `parsed.ContextQuestionId == 5`
- [ ] Chạy `dotnet test` toàn bộ `KRepoMarkdownRoundTripTests` — tất cả pass

## FE — Types

- [ ] `src\features\K\types\kQuiz.type.ts` — thêm `context?: string | null` vào `KDailySessionQuestion`
- [ ] `kQuiz.type.ts` — thêm `context?: string | null` vào `KQuestion`

## FE — Review UI

- [ ] Tìm Shiki wrapper component đang dùng trong `KAttachmentViewerDialog` — xác định tên và path
- [ ] `KDailyReviewSession.tsx` — insert context block giữa attachment pills và answer box:
  - Dùng Shiki component, detect language từ fenced code block đầu tiên trong context string
  - `opacity-100` khi `!showResult`, `opacity-0 pointer-events-none` khi `showResult`
  - Transition duration match với answer reveal animation

## Verification

- [ ] `dotnet test` — không có test nào fail
- [ ] Sync file `.md` có `context:` section → kiểm tra DB `k.question.context` đúng
- [ ] Sync file `.md` có `getctx:5` → kiểm tra DB `k.question.context_question_id = 5`
- [ ] Mở daily review → context (resolved) hiển thị với syntax highlight
- [ ] Click reveal → context fade out, answer hiện ra
- [ ] Question không có context → UX không đổi

