# Context: Thêm field `context` vào k_question

## Vấn đề hiện tại

`k_question.description` đang chứa lẫn lộn code và lời giải thích. Khi user review flashcard, họ cần thấy **câu hỏi + code mẫu** trước, sau đó mới click để xem **câu trả lời/giải thích**. Hiện tại không có cách nào tách hai phần này.

## Mục tiêu

Thêm column `context` và `context_question_id` vào `k.question` để:
- Lưu code snippet / ví dụ / đoạn code cần phân tích (owned context)
- Cho phép nhiều question dùng chung context của 1 question khác (borrowed context qua `getctx:id`)
- Hiển thị cùng câu hỏi trong review session (trước khi reveal)
- Ẩn đi khi user reveal câu trả lời
- Round-trip an toàn qua git repo sync (markdown ↔ DB)

## Resolved context (service layer)

Service resolve context theo thứ tự ưu tiên:
1. Nếu question có `context_question_id` → lấy `context` từ question đó (borrowed)
2. Else nếu question có `context` của chính nó → dùng trực tiếp (owned)
3. Else → null (không hiển thị gì)

FE nhận `context` đã resolved — không cần biết nguồn gốc.

## UX review session sau khi xong

```
┌─────────────────────────────────────┐
│  [Câu hỏi]                          │  ← luôn hiển thị
│                                     │
│  ```python                          │
│  # code context ở đây               │  ← hiển thị cùng câu hỏi
│  def foo(): ...                     │     với Shiki syntax highlight
│  ```                                │
│                                     │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← answer bị blur
└─────────────────────────────────────┘
             ↓ click reveal
┌─────────────────────────────────────┐
│  [Câu hỏi]                          │
│                                     │
│  (context fades out)                │  ← opacity → 0
│                                     │
│  [Câu trả lời / giải thích]         │  ← hiển thị rõ
└─────────────────────────────────────┘
```

## Markdown format trong git repo

**Owned context** (question tự sở hữu context — code block đầu tiên trong description):
```markdown
# Question A [id:5 order:1]
```python
def foo():
    return 1
```

Answer A — phần text sau code block
```

**Borrowed context** (mượn context từ question khác):
```markdown
# Question B [id:6 order:2 getctx:5]
Answer B — không có code block riêng
```

**Rule parse**:
- Sau heading, nếu gặp opening fence (` ``` ` hoặc `~~~`) và chưa có answer text thực sự (answer null hoặc chỉ toàn blank lines) → đọc vào context buffer cho đến closing fence (inclusive). Phần còn lại là answer.
- Blank lines giữa heading và context → được bỏ qua (parser dùng `string.IsNullOrWhiteSpace(answer)` để check, không phải `answer == null`)
- Blank lines giữa context và answer → an toàn, bị trim lúc flush
- Nếu dòng đầu tiên thực sự là text → không có context, toàn bộ là answer.
- `getctx:N` trong bracket tag → set `context_question_id = N`. Không có code block riêng cho question này.
- Blank line trong code block hoàn toàn an toàn.

**Rule build** (DB → markdown):
- Nếu question có `context` → write `{context.Trim()}\n\n` trước description (code block tự nhiên, không cần label)
- Nếu question có `context_question_id` (và không có owned context) → write `getctx:{id}` vào bracket tag
- Answer (description) write sau context như bình thường

## Scope thay đổi

| Layer | Mô tả |
|---|---|
| SQL migration | Thêm `context nvarchar(max) NULL` và `context_question_id int NULL FK` vào `k.question` |
| BE Entity | Thêm `Context` và `ContextQuestionId` |
| BE EF Config | Map 2 columns mới |
| BE DTO | Thêm `Context` (resolved) vào response DTOs |
| BE Service | Resolve context: borrowed → owned → null |
| BE Upsert | Nhận `Context` và `ContextQuestionId` khi save |
| Markdown Builder | Write `context:` section nếu owned; `getctx:id` tag nếu borrowed |
| Markdown Parser | Parse `context:` section + `getctx:` tag |
| ParsedQuestion record | Thêm `string? Context` và `int? ContextQuestionId` |
| Apply/Reconcile | Map parsed fields → entity |
| BE Tests | Round-trip tests cho owned + borrowed context |
| FE Types | Thêm `context` (resolved string) vào `KDailySessionQuestion` và `KQuestion` |
| FE Review UI | Hiển thị context với Shiki, fade out khi reveal answer |

## Constraints

- `context:` label là lowercase, exact match, không có trailing space
- Context section kết thúc khi gặp closing fence (` ``` ` hoặc `~~~`) — không dựa vào blank line
- Nếu question có cả `context` lẫn `context_question_id` → owned (`context`) thắng khi resolve
- `getctx:N` trong bracket tag, N là question id (integer) — không phải tên
- Shiki component: reuse component đang dùng trong `KAttachmentViewerDialog`
- Không break bất kỳ test nào hiện có trong `KRepoMarkdownRoundTripTests`
- Question không có context vẫn hoạt động bình thường (backward compatible)
