CREATE TABLE [pro].[check] (
    [id]              INT            IDENTITY (1, 1) NOT NULL,
    [task_type]       NVARCHAR (50)  NOT NULL,
    [group_name]      NVARCHAR (200) NOT NULL,
    [name]            NVARCHAR (500) NOT NULL,
    [description]     NVARCHAR (MAX) NULL,
    [order_index]     INT            NOT NULL,
    [is_optional]     BIT            NOT NULL,
    [parent_check_id] INT            NULL,
    [created_at]      DATETIME2 (3)  NOT NULL,
    [updated_at]      DATETIME2 (3)  NOT NULL
);
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [pk_check] PRIMARY KEY CLUSTERED ([id] ASC);
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [df_check_updated_at] DEFAULT (sysdatetime()) FOR [updated_at];
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [df_check_order_index] DEFAULT ((0)) FOR [order_index];
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [df_check_created_at] DEFAULT (sysdatetime()) FOR [created_at];
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [df_check_is_optional] DEFAULT ((0)) FOR [is_optional];
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [df_check_task_type] DEFAULT ('personal') FOR [task_type];
GO

CREATE NONCLUSTERED INDEX [ix_check_task_type_order]
    ON [pro].[check]([task_type] ASC, [order_index] ASC);
GO

CREATE NONCLUSTERED INDEX [ix_check_task_type]
    ON [pro].[check]([task_type] ASC);
GO

ALTER TABLE [pro].[check]
    ADD CONSTRAINT [fk_check_parent] FOREIGN KEY ([parent_check_id]) REFERENCES [pro].[check] ([id]);
GO

