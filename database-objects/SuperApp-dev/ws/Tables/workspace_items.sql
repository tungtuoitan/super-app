CREATE TABLE [ws].[workspace_items] (
    [id]           INT             IDENTITY (1, 1) NOT NULL,
    [workspace_id] INT             NOT NULL,
    [parent_id]    INT             NULL,
    [entity_type]  TINYINT         NOT NULL,
    [entity_id]    INT             NOT NULL,
    [created_at]   DATETIME2 (7)   CONSTRAINT [DF_workspace_items_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]   DATETIME2 (7)   NULL,
    [deleted_at]   DATETIME2 (7)   NULL,
    [PathIds]      NVARCHAR (1000) CONSTRAINT [DF_WorkspaceItems_PathIds] DEFAULT ('/') NOT NULL,
    [PathDepth]    INT             CONSTRAINT [DF_WorkspaceItems_PathDepth] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_workspace_items] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [CK_WorkspaceItems_MaxDepth] CHECK ([PathDepth]<=(10)),
    CONSTRAINT [FK_workspace_items_parent] FOREIGN KEY ([parent_id]) REFERENCES [ws].[workspace_items] ([id]),
    CONSTRAINT [FK_workspace_items_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [ws].[workspaces] ([id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_workspace_items_unique] UNIQUE NONCLUSTERED ([workspace_id] ASC, [entity_type] ASC, [entity_id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_WorkspaceItems_PathIds]
    ON [ws].[workspace_items]([PathIds] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_workspace_items_parent_id]
    ON [ws].[workspace_items]([parent_id] ASC) WHERE ([parent_id] IS NOT NULL);


GO

CREATE NONCLUSTERED INDEX [IX_WorkspaceItems_PathDepth]
    ON [ws].[workspace_items]([PathDepth] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_workspace_items_workspace_entity]
    ON [ws].[workspace_items]([workspace_id] ASC, [entity_type] ASC, [entity_id] ASC);


GO

