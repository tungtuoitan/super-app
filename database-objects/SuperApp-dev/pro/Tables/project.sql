CREATE TABLE [pro].[project] (
    [id]           INT            IDENTITY (1, 1) NOT NULL,
    [name]         NVARCHAR (255) NOT NULL,
    [description]  NVARCHAR (MAX) NULL,
    [status]       NVARCHAR (50)  ALTER TABLE [pro].[project]
    ADD CONSTRAINT [df_project_status] DEFAULT ('open') FOR [status_code]; NOT NULL,
    [created_at]   DATETIME2 (3)  CONSTRAINT [df_project_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]   DATETIME2 (3)  CONSTRAINT [df_project_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]   DATETIME2 (3)  NULL,
    [user_id]      INT            NULL,
    [start_date]   DATETIME2 (7)  NULL,
    [end_date]     DATETIME2 (7)  NULL,
    [workspace_id] INT            NULL,
    [image]        NVARCHAR (MAX) NULL,
    CONSTRAINT [pk_project] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_project_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [ws].[workspaces] ([id]) ON DELETE SET NULL
);


GO

CREATE NONCLUSTERED INDEX [IX_project_workspace_id]
    ON [pro].[project]([workspace_id] ASC);


GO

