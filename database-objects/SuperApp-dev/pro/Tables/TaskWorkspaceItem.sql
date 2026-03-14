CREATE TABLE [pro].[TaskWorkspaceItem] (
    [Id]              INT IDENTITY (1, 1) NOT NULL,
    [TaskId]          INT NOT NULL,
    [WorkspaceItemId] INT NOT NULL,
    [ItemType]        INT NOT NULL,
    CONSTRAINT [PK_TaskWorkspaceItem] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_TaskWorkspaceItem_Task] FOREIGN KEY ([TaskId]) REFERENCES [pro].[task] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TaskWorkspaceItem_WorkspaceItem] FOREIGN KEY ([WorkspaceItemId]) REFERENCES [ws].[workspace_items] ([id]) ON DELETE CASCADE
);


GO

