CREATE TABLE [ws].[workspaces] (
    [id]          INT             IDENTITY (1, 1) NOT NULL,
    [user_id]     INT             NOT NULL,
    [name]        NVARCHAR (255)  NOT NULL,
    [description] NVARCHAR (1000) NULL,
    [created_at]  DATETIME2 (7)   DEFAULT (getutcdate()) NULL,
    [updated_at]  DATETIME2 (7)   NULL,
    [deleted_at]  DATETIME2 (7)   NULL,
    [status_code] NVARCHAR (50)   NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_workspaces_user] FOREIGN KEY ([user_id]) REFERENCES [urm].[users] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_workspaces_user]
    ON [ws].[workspaces]([user_id] ASC) WHERE ([deleted_at] IS NULL);


GO

