
CREATE PROCEDURE [k].[sp_DeleteNodes]
    @iv_workspace_id  INT,
    @iv_item_ids      NVARCHAR(MAX),  -- JSON: [1, 2, 3] (workspace_items.id)
    @ov_deleted_count INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Parse JSON → workspace_item IDs
        SELECT CAST(value AS INT) AS workspace_item_id
        INTO #RootItemIds
        FROM OPENJSON(@iv_item_ids);

        -- Validate tất cả items thuộc workspace này
        IF (SELECT COUNT(*) FROM #RootItemIds) != (
            SELECT COUNT(*) FROM [kws].[workspace_items] wi
            INNER JOIN #RootItemIds r ON wi.id = r.workspace_item_id
            WHERE wi.workspace_id = @iv_workspace_id
        )
        BEGIN
            RAISERROR('One or more items not found in this workspace', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Đệ quy thu thập con cháu qua self-ref parent_id
        CREATE TABLE #AllItemIds (workspace_item_id INT PRIMARY KEY);
        INSERT INTO #AllItemIds SELECT workspace_item_id FROM #RootItemIds;

        DECLARE @added INT = 1;
        WHILE @added > 0
        BEGIN
            INSERT INTO #AllItemIds (workspace_item_id)
            SELECT wi.id
            FROM [kws].[workspace_items] wi
            INNER JOIN #AllItemIds p ON wi.parent_id = p.workspace_item_id
            WHERE wi.workspace_id = @iv_workspace_id
              AND NOT EXISTS (SELECT 1 FROM #AllItemIds WHERE workspace_item_id = wi.id);
            SET @added = @@ROWCOUNT;
        END

        -- Hard delete workspace_items rows (luôn xóa node)
        DELETE FROM [kws].[workspace_items]
        WHERE id IN (SELECT workspace_item_id FROM #AllItemIds);

        SELECT @ov_deleted_count = COUNT(*) FROM #AllItemIds;

        COMMIT TRANSACTION;

        DROP TABLE #RootItemIds;
        DROP TABLE #AllItemIds;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @sev INT            = ERROR_SEVERITY();
        DECLARE @st  INT            = ERROR_STATE();
        RAISERROR(@msg, @sev, @st);
    END CATCH
END

GO

