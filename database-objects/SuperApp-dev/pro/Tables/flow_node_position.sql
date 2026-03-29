CREATE TABLE [pro].[flow_node_position] (
    [id]         INT           IDENTITY (1, 1) NOT NULL,
    [user_id]    INT           NOT NULL,
    [node_id]    INT           NOT NULL,
    [node_type]  NVARCHAR (20) CONSTRAINT [df_flow_node_position_type] DEFAULT ('task') NOT NULL,
    [x]          FLOAT         CONSTRAINT [df_flow_node_position_x] DEFAULT ((0)) NOT NULL,
    [y]          FLOAT         CONSTRAINT [df_flow_node_position_y] DEFAULT ((0)) NOT NULL,
    [created_at] DATETIME2 (3) CONSTRAINT [df_flow_node_position_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at] DATETIME2 (3) CONSTRAINT [df_flow_node_position_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    CONSTRAINT [pk_flow_node_position] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [uq_flow_node_position] UNIQUE ([user_id], [node_id], [node_type])
);

GO

CREATE INDEX [ix_flow_node_position_user_id] ON [pro].[flow_node_position] ([user_id]);
