# Task 4-Section Feature Context

> Ngày tạo: 2026-03-21
> Cập nhật: 2026-03-21 — Phase 1 DONE, Phase 2 Lite DONE, Phase 3 DONE (Comment section)
> Mục đích: Lưu context để tiếp tục triển khai với AI khác

---

## 1. Tổng quan yêu cầu

Upgrade TaskDetailContent từ checklist đơn giản thành **4 section tabs**: Process / Checklist / Desc / Comment.

### Mục đích
- Dễ theo dõi (process)
- Dễ đánh giá (checklist/testcase)
- Lưu thông tin, bài học (comment)
- Hỗ trợ taskType = build-habit (repeat-checklist)

### Vòng đời task
```
có mục đích → tạo task → viết desc → tạo progress/testcase/comment
→ làm + cập nhật → completed/fail
```

---

## 2. Chi tiết 4 Section

### 2.1 Desc Section
- **Giữ nguyên** RichTextEditor hiện tại (field `note` trong task)
- Tab mặc định khi task mới (id < 0)

### 2.2 Process Section
- Chuỗi checklist **có thứ tự** (sequential steps)
- Format markdown tương tự checklist hiện tại
- **Lưu vào cột riêng** `process_json` (NVARCHAR MAX) trong `pro.task`
- Tab mặc định khi mở task cũ (id > 0)
- Reuse logic từ checklist hiện tại (nextRequiredIndex, sequential checking)

### 2.3 Checklist Section
- 3 sub-type: **testcase** / **checklist** / **repeat-checklist**
- **Tạm giữ nguyên** isChecked/isSkipped (chưa migrate sang tri-state)
- Lưu trong `checklist_json` hiện tại, thêm field `checklistType` vào JSON structure
- Lịch sử repeat-checklist: lưu vào bảng mới `pro.task_checklist_history`

#### UI theo type:
| Type | UI tweak |
|------|----------|
| repeat-checklist (habit) | Có streak 🔥 + graph per item |
| testcase | Có pass/fail badge |
| checklist (simple) | Checkbox thường |

#### Repeat-checklist Design (confirmed)
- **Template vs Instance**:
  - `task.checklist_json` = TEMPLATE (structure only, luôn unchecked)
  - `task_checklist_history` = INSTANCE (per day, chứa checked state)
- **Snapshot strategy**: 1 row/ngày, UPSERT mỗi lần check/uncheck
  - `(task_id, date)` UNIQUE constraint
  - Khi thay đổi template → chỉ ảnh hưởng instance từ ngày đó về sau
  - Snapshot cũ giữ nguyên (self-contained)
- **Repeat frequency**: Default daily, chưa cần chọn
- **Ngày mới**: Mở task → kiểm tra có snapshot hôm nay chưa?
  - Chưa → hiển thị template (fresh, unchecked)
  - Rồi → hiển thị snapshot đó
- **Streak**: Tính realtime từ history (không cần bảng riêng, scan nhẹ)
- **UI hiển thị streak**:
  - Compact badge: 🔥12 (streak tốt) / ⚠️0 (streak gãy) — trên header + timeline
  - Graph per item: tương tự TrackGraphContent (recharts Scatter/Bar)
    - Y-axis = checklist items, X-axis = ngày, dot = completed
    - Toolbar: graph mode (frequency/count), date range (7/14/30/90/all)
    - Reuse pattern từ `src/Components/LifeLog/TrackTimelineSheet.tsx`

#### Testcase environments
- Hỗ trợ local/dev/uat (uat là optional)
- CheckItem có thể optional
- Tạm dùng isChecked, chưa cần tri-state

### 2.4 Comment Section
- Bài học, comment lưu vào bảng mới `pro.task_comment`
- RichText editor tương tự description
- Hỗ trợ reply (nested 1 level)
- **Filter lifelog**: không hiển thị log từ task.comment trong lifelog

---

## 3. Quyết định Data Model

### 3.1 DB Schema Changes

#### ALTER `pro.task` — thêm cột:
```sql
ALTER TABLE [pro].[task] ADD [process_json] NVARCHAR(MAX) NULL;
```

#### CREATE `pro.task_comment`:
```sql
CREATE TABLE [pro].[task_comment] (
    [id]                INT            IDENTITY(1,1) NOT NULL,
    [task_id]           INT            NOT NULL,
    [parent_comment_id] INT            NULL,          -- reply thread (1 level)
    [content]           NVARCHAR(MAX)  NOT NULL,       -- RichText HTML
    [user_id]           INT            NOT NULL,
    [created_at]        DATETIME2(3)   DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]        DATETIME2(3)   DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]        DATETIME2(3)   NULL,
    CONSTRAINT [PK_task_comment]       PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_task_comment_task]   FOREIGN KEY ([task_id]) REFERENCES [pro].[task]([id]),
    CONSTRAINT [FK_task_comment_parent] FOREIGN KEY ([parent_comment_id]) REFERENCES [pro].[task_comment]([id])
);
CREATE INDEX [IX_task_comment_task_id] ON [pro].[task_comment]([task_id]);
```

#### CREATE `pro.task_checklist_history`:
```sql
CREATE TABLE [pro].[task_checklist_history] (
    [id]                  INT            IDENTITY(1,1) NOT NULL,
    [task_id]             INT            NOT NULL,
    [date]                DATE           NOT NULL,      -- ngày nào
    [checklist_snapshot]  NVARCHAR(MAX)  NOT NULL,       -- JSON snapshot checklist_json tại thời điểm đó
    [created_at]          DATETIME2(3)   DEFAULT (sysdatetime()) NOT NULL,
    CONSTRAINT [PK_task_checklist_history] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_task_checklist_history_task] FOREIGN KEY ([task_id]) REFERENCES [pro].[task]([id]),
    CONSTRAINT [UQ_task_checklist_history_task_date] UNIQUE ([task_id], [date])
);
```

### 3.2 Type Changes (Frontend)

#### ChecklistJSON mở rộng:
```typescript
// src/types/task/checklist.types.ts
export type ChecklistType = "testcase" | "checklist" | "repeat-checklist";

export interface ChecklistJSON {
    checklistType: ChecklistType;  // NEW
    groups: ChecklistGroup[];
}

// Không thay đổi ChecklistItem (giữ isChecked/isSkipped)
```

#### ProcessJSON (mới):
```typescript
// Cùng structure với ChecklistJSON, nhưng luôn sequential
export interface ProcessJSON {
    groups: ChecklistGroup[];  // Reuse ChecklistGroup
}
```

#### TaskComment (mới):
```typescript
export interface TaskComment {
    id: number;
    taskId: number;
    parentCommentId?: number | null;
    content: string;
    userId: number;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
    replies?: TaskComment[];   // populated on frontend
}
```

#### Task type mở rộng:
```typescript
export interface Task {
    // ... existing fields ...
    processJson?: string | null;   // NEW — process section data
}
```

---

## 4. Quyết định UX / Behavior

### 4.1 Tab persistence
- Dùng **store** để lưu state mỗi section (draft comment, edit mode checklist/process, scroll position)
- Khi chuyển tab: không unmount, giữ state trong store
- Khi rời task rồi quay lại: state vẫn còn (trong store, mất khi refresh)

### 4.2 Tab mặc định
- Task mới (id < 0): mở tab **Desc**
- Task cũ (id > 0): mở tab **Process**

### 4.3 Real-time save
- Check/uncheck trong process/checklist → **update DB ngay** (như hiện tại)
- Comment: save khi submit
- Desc: auto-save (như hiện tại)

---

## 5. Bonus Items

### 5.1 TaskType: build-habit
- Insert vào `standardRegistry` (type = "taskType", code = "build-habit")
- Khi taskType = "build-habit", checklist tự động là `repeat-checklist`
- Hiển thị streak 🔥 và score/warning indicator

### 5.2 TaskBar overflow fix (Timeline)
- File: `src/Components/Task/TaskBar.tsx`
- Vấn đề: khi bar quá ngắn, tên task tràn ra ngoài, không thấy được
- Fix: hiển thị tên ở **ngay cạnh trái** của container (bên ngoài bar, position absolute)

### 5.3 Habit score/warning
- Tính từ `task_checklist_history`: streak liên tiếp, % completion gần đây
- Hiển thị dấu chấm than ⚠️ nếu habit đang tệ (ví dụ: miss 3+ ngày liên tiếp)

### 5.4 Filter lifelog
- Trong lifelog query, thêm filter loại bỏ log type = "task_comment" (nếu dùng log.log)
- Vì comment giờ dùng bảng riêng `pro.task_comment`, nên tự nhiên lifelog đã không chứa comment
- Chỉ cần đảm bảo không tạo log entry khi user comment trên task

---

## 6. Phân pha triển khai (đề xuất)

### Phase 1: Tab UI + Process + Desc — ✅ DONE
**Đã hoàn thành:**
- DB: `ALTER TABLE pro.task ADD process_json NVARCHAR(MAX) NULL`
- Backend: ProTask, UpsertTaskRequest, TaskService, TaskRepository, ProTaskConfiguration
- Frontend: TaskDetailSection.tsx (tab bar), TaskProcess.tsx, stores, selectors, helpers, headless
- Tab mặc định hoạt động: id<0→Desc, id>0→Process

### Phase 2 Lite: ChecklistType + History table — ✅ DONE
**Đã hoàn thành:**
- Types: `ChecklistType` ("testcase"|"checklist"|"repeat-checklist") vào checklist.types.ts
- Utils: parseTextToChecklist/toggleChecklistItem preserve checklistType
- Store: `editChecklistType` + `setEditChecklistType` vào TaskChecklist store
- Helper: handleStartEdit/handleSaveEdit sử dụng checklistType
- UI: type selector trong edit mode, type badge trong view mode header
- DB: `CREATE TABLE pro.task_checklist_history` (migration SQL + entity + EF config + DbSet)

**Chưa làm (Phase 2 Full):**
- Backend API cho checklist history (save/get daily snapshot)
- Frontend service + helper cho checklist history
- Habit streak 🔥 UI
- Testcase environment badges (local/dev/uat)

### Phase 3: Comment section (2-3 ngày)
**DB**: `CREATE TABLE pro.task_comment`
**Backend**: Full CRUD API (TaskCommentController)
**Frontend**:
- Comment list + RichText composer + reply
- Lifelog filter (nếu cần)
- Files mới:
  - `src/types/task/taskComment.types.ts`
  - `src/services/taskComment.service.ts`
  - `src/store/task/useTaskComment.store.ts`
  - `src/Selectors/task/TaskCommentSelector.ts`
  - `src/hooks/task/useTaskComment.helper.ts`
  - `src/HeadlessComponents/task/TaskCommentHeadless.tsx`
  - `src/Components/Task/TaskComment.tsx`

### Phase 4: Build-habit + Bonus (2-3 ngày)
- Insert standardRegistry record
- Habit-specific UI (streak, score, warning)
- TaskBar overflow fix
- Checklist history aggregation cho habit scoring

---

## 7. File Map hiện tại (liên quan)

### Database
```
database-objects/SuperApp-dev/pro/Tables/task.sql          ← ALTER thêm process_json
database-objects/SuperApp-dev/pro/Tables/                   ← CREATE task_comment.sql, task_checklist_history.sql
database-objects/SuperApp-dev/log/Tables/log.sql            ← không cần sửa
```

### Backend (C#)
```
SuperAppAPI/Controllers/TaskController.cs                   ← update DTO
SuperAppAPI/Controllers/                                    ← CREATE TaskCommentController.cs
```

### Frontend — Hiện tại
```
src/Components/Task/TaskDetailContent.tsx     ← SỬA: thêm tab bar, tổ chức lại sections
src/Components/Task/TaskChecklist.tsx         ← SỬA: thêm checklistType logic
src/types/task/checklist.types.ts             ← SỬA: thêm ChecklistType, ProcessJSON
src/types/task/task.types.ts                  ← SỬA: thêm processJson field
src/store/task/useTaskChecklist.store.ts      ← SỬA: thêm checklistType state
src/Selectors/task/TaskChecklistSelector.ts   ← SỬA: derive theo type
src/hooks/task/useTaskChecklist.helper.ts     ← SỬA: handle type switching
src/utils/checklist.utils.ts                  ← SỬA: parse/validate process + checklist types
```

### Frontend — Files mới (Phase 1-4)
```
src/Components/Task/TaskDetailSection.tsx
src/Components/Task/TaskProcess.tsx
src/Components/Task/TaskComment.tsx
src/store/task/useTaskDetailSection.store.ts
src/store/task/useTaskComment.store.ts
src/hooks/task/useTaskProcess.helper.ts
src/hooks/task/useTaskComment.helper.ts
src/Selectors/task/TaskProcessSelector.ts
src/Selectors/task/TaskCommentSelector.ts
src/HeadlessComponents/task/TaskProcessHeadless.tsx
src/HeadlessComponents/task/TaskCommentHeadless.tsx
src/services/taskComment.service.ts
src/services/taskChecklistHistory.service.ts
src/types/task/taskComment.types.ts
src/types/task/taskChecklistHistory.types.ts
```

---

## 8. Lưu ý quan trọng

1. **CLAUDE.md rules**: Max 400 lines/file, single responsibility, no re-exports, destructuring without alias, hooks gọi trực tiếp (không truyền state/helper/selector qua params)
2. **Checklist migration**: Tạm giữ isChecked boolean, CHƯA migrate sang tri-state pending/pass/fail
3. **Comment dùng bảng riêng** `pro.task_comment`, KHÔNG dùng `log.log`
4. **Process dùng cột riêng** `process_json`, KHÔNG dùng chung `checklist_json`
5. **Store persistence**: Dùng store (không persist localStorage), chấp nhận mất khi refresh
6. **Tab mặc định**: id < 0 → Desc, id > 0 → Process
