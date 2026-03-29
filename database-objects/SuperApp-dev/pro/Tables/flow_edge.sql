CREATE TABLE [pro].[flow_edge] (
    [id]            INT            IDENTITY (1, 1) NOT NULL,
    [user_id]       INT            NOT NULL,
    [source_id]     INT            NOT NULL,
    [source_type]   NVARCHAR (20)  CONSTRAINT [df_flow_edge_source_type]   DEFAULT ('task')   NOT NULL,
    [source_handle] NVARCHAR (20)  CONSTRAINT [df_flow_edge_source_handle] DEFAULT ('bottom') NOT NULL,
    [target_id]     INT            NOT NULL,
    [target_type]   NVARCHAR (20)  CONSTRAINT [df_flow_edge_target_type]   DEFAULT ('task')   NOT NULL,
    [target_handle] NVARCHAR (20)  CONSTRAINT [df_flow_edge_target_handle] DEFAULT ('top')    NOT NULL,
    [note]          NVARCHAR (500) NULL,
    [arrow_direction] NVARCHAR (10) CONSTRAINT [df_flow_edge_arrow_direction] DEFAULT ('forward') NOT NULL,
    [created_at]    DATETIME2 (3)  CONSTRAINT [df_flow_edge_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]    DATETIME2 (3)  CONSTRAINT [df_flow_edge_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]    DATETIME2 (3)  NULL,
    CONSTRAINT [pk_flow_edge] PRIMARY KEY CLUSTERED ([id] ASC)
);

GO

CREATE INDEX [ix_flow_edge_user_id] ON [pro].[flow_edge] ([user_id]) WHERE [deleted_at] IS NULL;
