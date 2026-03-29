CREATE TABLE [pro].[task_comment] (
    [id]                INT            IDENTITY (1, 1) NOT NULL,
    [task_id]           INT            NOT NULL,
    [parent_comment_id] INT            NULL,
    [content]           NVARCHAR (MAX) NOT NULL,
    [user_id]           INT            NOT NULL,
    [created_at]        DATETIME2 (3)  NOT NULL,
    [updated_at]        DATETIME2 (3)  NOT NULL,
    [deleted_at]        DATETIME2 (3)  NULL
);
GO

ALTER TABLE [pro].[task_comment]
    ADD CONSTRAINT [DF_task_comment_created_at] DEFAULT (sysdatetime()) FOR [created_at];
GO

ALTER TABLE [pro].[task_comment]
    ADD CONSTRAINT [DF_task_comment_updated_at] DEFAULT (sysdatetime()) FOR [updated_at];
GO

ALTER TABLE [pro].[task_comment]
    ADD CONSTRAINT [FK_task_comment_task] FOREIGN KEY ([task_id]) REFERENCES [pro].[task] ([id]);
GO

ALTER TABLE [pro].[task_comment]
    ADD CONSTRAINT [FK_task_comment_parent] FOREIGN KEY ([parent_comment_id]) REFERENCES [pro].[task_comment] ([id]);
GO

CREATE NONCLUSTERED INDEX [IX_task_comment_parent_comment_id]
    ON [pro].[task_comment]([parent_comment_id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_task_comment_task_id]
    ON [pro].[task_comment]([task_id] ASC);
GO

ALTER TABLE [pro].[task_comment]
    ADD CONSTRAINT [PK_task_comment] PRIMARY KEY CLUSTERED ([id] ASC);
GO

