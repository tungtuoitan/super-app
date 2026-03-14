CREATE TABLE [pro].[task] (
    [id]                    INT            IDENTITY (1, 1) NOT NULL,
    [project_id]            INT            NOT NULL,
    [parent_task_id]        INT            NULL,
    [type]                  NVARCHAR (20)  CONSTRAINT [df_task_type] DEFAULT ('task') NOT NULL,
    [title]                 NVARCHAR (500) NOT NULL,
    [note]                  NVARCHAR (MAX) NULL,
    [status]                NVARCHAR (20)  CONSTRAINT [df_task_status] DEFAULT ('open') NOT NULL,
    [priority]              NVARCHAR (20)  CONSTRAINT [df_task_priority] DEFAULT ('low') NOT NULL,
    [start_date]            DATETIME2 (3)  NULL,
    [end_date]              DATETIME2 (3)  NULL,
    [order_index]           INT            CONSTRAINT [df_task_order_index] DEFAULT ((0)) NOT NULL,
    [created_at]            DATETIME2 (3)  CONSTRAINT [df_task_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]            DATETIME2 (3)  CONSTRAINT [df_task_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]            DATETIME2 (3)  NULL,
    [FolderWorkspaceItemId] INT            NULL,
    CONSTRAINT [pk_task] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [fk_task_folder_workspace_item] FOREIGN KEY ([FolderWorkspaceItemId]) REFERENCES [ws].[workspace_items] ([id]),
    CONSTRAINT [fk_task_parent] FOREIGN KEY ([parent_task_id]) REFERENCES [pro].[task] ([id]),
    CONSTRAINT [fk_task_project] FOREIGN KEY ([project_id]) REFERENCES [pro].[project] ([id])
);


GO

