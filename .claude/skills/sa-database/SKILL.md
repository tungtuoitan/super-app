---
name: sa-database
description: SuperApp DB conventions — snake_case naming, standard columns, soft delete, status codes, and how to apply schema changes.
---

# SuperApp Database Conventions

Reference khi thêm bảng mới, sửa schema, hoặc review migrations.

---

## 1. Naming Convention — snake_case

Tất cả table names và column names dùng **snake_case** (`a_b_c`).

| ❌ Sai | ✅ Đúng |
|---|---|
| `PathIds` | `path_ids` |
| `FolderWorkspaceItemId` | `folder_workspace_item_id` |
| `TaskWorkspaceItem` | `task_workspace_item` |
| `TargetKeywords` | `target_keywords` |
| `CreatedAt` | `created_at` |

Trong EF Core config, **mọi property đều phải có** `.HasColumnName("snake_case_name")` — không được để EF tự suy ra tên.

---

## 2. Cột Audit Chuẩn

| Cột | Type | Nullable | Ghi chú |
|---|---|---|---|
| `created_at` | `DATETIME2` | NOT NULL | Default `SYSDATETIME()` hoặc `GETUTCDATE()` |
| `updated_at` | `DATETIME2` | NULL | Set khi update |
| `deleted_at` | `DATETIME2` | NULL | Soft delete — NULL = active |
| `status_code` | `NVARCHAR(50)` | NULL | Lifecycle state (xem mục 3) |

**Áp dụng cho:** tất cả entity tables có vòng đời (created/updated/deleted).

**Không cần cho:** junction tables (`entity_hashtags`, `info_keyword`, `keyword_synonym`), immutable log tables (`point_history`, `task_checklist_history`), auth tokens (`refresh_tokens`).

---

## 3. status_code — Các bảng đang dùng

| Table | Schema | Các giá trị status_code biết được |
|---|---|---|
| `knowledge` | `k` | `"active"` |
| `node` | `k` | `"learning"`, `"draft"` (null = active/learning) |
| `question` | `k` | `"learning"` (in review), `"draft"` (excluded from review) |
| `workspaces` | `ws` | — |
| `notes` | `dbo` | — |
| `files` | `dbo` | — |
| `project` | `pro` | `"open"` (default) |
| `task` | `pro` | `"open"` (default) |

**Quan trọng:** `status` là tên sai — phải dùng `status_code` để đồng nhất.

---

## 4. Soft Delete Pattern

- Active record: `deleted_at IS NULL`
- Deleted record: `deleted_at = <timestamp>`
- **Không dùng** `IsActive` boolean cho soft delete (ngoại lệ: `k.question` dùng `is_active` vì lý do lịch sử)
- Filter mặc định trong query: `.Where(x => x.DeletedAt == null)`

**Filter active cho từng bảng quan trọng:**

```sql
-- k.knowledge: active
WHERE deleted_at IS NULL AND status_code = 'active'

-- k.node: active (đang học)
WHERE deleted_at IS NULL AND status_code = 'learning'

-- k.question: in review sessions
WHERE deleted_at IS NULL AND status_code = 'learning'
-- k.question: all non-deleted (including draft)
WHERE deleted_at IS NULL
```

---

## 5. Schemas

| Schema | Dùng cho |
|---|---|
| `dbo` | Core entities: notes, files, hashtags, entities |
| `k` | Knowledge module: knowledge, node, question, point_history |
| `ws` | Workspace: workspaces, folders, workspace_items |
| `pro` | Productivity: project, task, target_keywords, task_workspace_item |
| `urm` | User Resource Management: users, user_profiles |
| `auth` | Auth: refresh_tokens |
| `log` | LifeLog: log, track |
| `wiki` | Wiki: info, keyword, keyword_synonym |

---

## 6. EF Core Config Checklist

Khi tạo `IEntityTypeConfiguration<T>` mới:

```csharp
builder.ToTable("table_name", "schema");          // snake_case table name

builder.Property(x => x.Id)
    .HasColumnName("id")
    .ValueGeneratedOnAdd();

// Tất cả properties phải có HasColumnName
builder.Property(x => x.CreatedAt)
    .HasColumnName("created_at")
    .HasDefaultValueSql("SYSDATETIME()");

builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
builder.Property(x => x.DeletedAt).HasColumnName("deleted_at");
builder.Property(x => x.StatusCode).HasColumnName("status_code");
```

---

## 7. Cách Apply Schema Change lên DB

Project **không dùng EF Migrations** — dùng SQL script thủ công.

### Rename column
```sql
EXEC sp_rename 'schema.table.OldName', 'new_name', 'COLUMN';
```

### Rename table
```sql
EXEC sp_rename 'schema.OldTableName', 'new_table_name';
```

### Add nullable column
```sql
ALTER TABLE schema.table ADD column_name DATETIME2 NULL;
```

### Nếu column có CHECK constraint (lỗi "enforced dependencies")
```sql
-- 1. Drop constraint trước
ALTER TABLE schema.table DROP CONSTRAINT CK_constraint_name;
-- 2. Rename
EXEC sp_rename 'schema.table.OldName', 'new_name', 'COLUMN';
-- 3. Recreate với tên mới
ALTER TABLE schema.table ADD CONSTRAINT CK_constraint_name CHECK (new_name <= value);
```

### Quy trình deploy
1. Backup prod trước: `BACKUP DATABASE [SuperApp-pro] TO DISK = N'/var/opt/mssql/data/SuperApp-pro-YYYYMMDD.bak' WITH FORMAT, INIT, COMPRESSION;`
2. Apply lên dev (`SuperApp-dev`) và verify
3. Apply lên prod (`SuperApp-pro`)

Connection: `Server=157.66.101.51,1433; User Id=sa` (password trong `Timeline/.env`)

---

## Task

{{args}}
