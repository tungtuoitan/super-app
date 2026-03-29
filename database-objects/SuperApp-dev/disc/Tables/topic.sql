CREATE TABLE [disc].[topic] (
    [id]          INT            IDENTITY (1, 1) NOT NULL,
    [user_id]     INT            NOT NULL,
    [entity_type] NVARCHAR (50)  NULL,
    [entity_id]   INT            NULL,
    [name]        NVARCHAR (255) NOT NULL,
    [description] NVARCHAR (MAX) NULL,
    [created_at]  DATETIME2 (3)  CONSTRAINT [df_disc_topic_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]  DATETIME2 (3)  CONSTRAINT [df_disc_topic_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]  DATETIME2 (3)  NULL,
    CONSTRAINT [PK_disc_topic] PRIMARY KEY CLUSTERED ([id] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_disc_topic_entity]
    ON [disc].[topic] ([entity_type] ASC, [entity_id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_disc_topic_user_id]
    ON [disc].[topic] ([user_id] ASC);
GO
