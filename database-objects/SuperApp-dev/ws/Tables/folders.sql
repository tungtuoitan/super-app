CREATE TABLE [ws].[folders] (
    [id]          INT            IDENTITY (1, 1) NOT NULL,
    [user_id]     INT            NOT NULL,
    [name]        NVARCHAR (255) NOT NULL,
    [description] NVARCHAR (MAX) NULL,
    [color]       NVARCHAR (7)   DEFAULT ('#F59E0B') NULL,
    [icon]        NVARCHAR (50)  DEFAULT ('??') NULL,
    [created_at]  DATETIME2 (7)  DEFAULT (getutcdate()) NULL,
    [updated_at]  DATETIME2 (7)  NULL,
    [deleted_at]  DATETIME2 (7)  NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_folders_user] FOREIGN KEY ([user_id]) REFERENCES [urm].[users] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_folders_created]
    ON [ws].[folders]([created_at] DESC);


GO

CREATE NONCLUSTERED INDEX [IX_folders_name]
    ON [ws].[folders]([name] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_folders_user]
    ON [ws].[folders]([user_id] ASC) WHERE ([deleted_at] IS NULL);


GO

