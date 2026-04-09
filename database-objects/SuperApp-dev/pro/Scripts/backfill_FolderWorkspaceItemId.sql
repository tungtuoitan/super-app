-- =====================================================================
-- Backfill pro.task.FolderWorkspaceItemId
--
-- Lý do: Code bug ghi đè FolderWorkspaceItemId thành NULL khi update task
-- mà client không gửi kèm field này.
--
-- Logic:
--   pro.task → pro.project (workspace_id)
--            → ws.workspace_items (cùng workspace, entity_type=2, parent_id IS NULL)
--            → ws.folders (name = task.title)
--   Chỉ update các task có FolderWorkspaceItemId IS NULL
-- =====================================================================

-- Step 1: Preview trước khi update
SELECT
    t.id              AS TaskId,
    t.title           AS TaskTitle,
    p.id              AS ProjectId,
    p.workspace_id    AS WorkspaceId,
    wi.id             AS FolderWorkspaceItemId,
    f.id              AS FolderId,
    f.name            AS FolderName
FROM pro.task t
INNER JOIN pro.project p
    ON p.id = t.project_id
    AND p.workspace_id IS NOT NULL
INNER JOIN ws.workspace_items wi
    ON wi.workspace_id = p.workspace_id
    AND wi.entity_type = 2              -- Folder
    AND wi.parent_id IS NULL            -- Root-level folder (tạo bởi _createTaskFolder)
    AND wi.deleted_at IS NULL
INNER JOIN ws.folders f
    ON f.id = wi.entity_id
    AND f.name = t.title                -- Folder name = Task title (synced)
    AND f.deleted_at IS NULL
WHERE t.FolderWorkspaceItemId IS NULL
    AND t.deleted_at IS NULL
ORDER BY t.id;

-- Step 2: Chạy update
UPDATE t
SET t.FolderWorkspaceItemId = wi.id,
    t.updated_at = SYSDATETIME()
FROM pro.task t
INNER JOIN pro.project p
    ON p.id = t.project_id
    AND p.workspace_id IS NOT NULL
INNER JOIN ws.workspace_items wi
    ON wi.workspace_id = p.workspace_id
    AND wi.entity_type = 2
    AND wi.parent_id IS NULL
    AND wi.deleted_at IS NULL
INNER JOIN ws.folders f
    ON f.id = wi.entity_id
    AND f.name = t.title
    AND f.deleted_at IS NULL
WHERE t.FolderWorkspaceItemId IS NULL
    AND t.deleted_at IS NULL;

PRINT CONCAT('Updated ', @@ROWCOUNT, ' tasks');
