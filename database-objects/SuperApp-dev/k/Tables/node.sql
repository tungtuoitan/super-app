CREATE TABLE [k].[node] (
    [id]                      INT             IDENTITY (1, 1) NOT NULL,
    [knowledge_id]            INT             NOT NULL,
    [parent_id]               INT             NULL,
    [created_at]              DATETIME2 (7)   CONSTRAINT [DF_kwi_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]              DATETIME2 (7)   NULL,
    [deleted_at]              DATETIME2 (7)   NULL,
    [PathIds]                 NVARCHAR (1000) ALTER TABLE [k].[node]
    ADD CONSTRAINT [DF_kwi_PathIds] DEFAULT ('/') FOR [path_ids]; NOT NULL,
    [PathDepth]               INT             ALTER TABLE [k].[node]
    ADD CONSTRAINT [DF_kwi_PathDepth] DEFAULT ((0)) FOR [path_depth]; NOT NULL,
    [name]                    NVARCHAR (255)  DEFAULT ('') NOT NULL,
    [description]             NVARCHAR (MAX)  NULL,
    [type_code]               NVARCHAR (50)   CONSTRAINT [DF_kwi_type_code] DEFAULT ('draft') NOT NULL,
    [icon]                    VARCHAR (MAX)   NULL,
    [color]                   VARCHAR (50)    NULL,
    [ref_target_id]           INT             NULL,
    [ref_target_knowledge_id] INT             NULL,
    [type]                    NVARCHAR (50)   NULL,
    [point]                   INT             CONSTRAINT [DF_knode_point] DEFAULT ((10)) NULL,
    [status]                  NVARCHAR (50)   CONSTRAINT [DF_knode_status] DEFAULT ('active') NULL,
    [status_code]             NVARCHAR (50)   NULL,
    CONSTRAINT [PK_kworkspace_items] PRIMARY KEY CLUSTERED ([id] ASC),
    ALTER TABLE [k].[node]
    ADD CONSTRAINT [CK_kwi_MaxDepth] CHECK ([path_depth]<=(30));,
    CONSTRAINT [FK_kwi_parent] FOREIGN KEY ([parent_id]) REFERENCES [k].[node] ([id]),
    CONSTRAINT [FK_kwi_workspace] FOREIGN KEY ([knowledge_id]) REFERENCES [k].[knowledge] ([id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_kwi_workspace]
    ON [k].[node]([knowledge_id] ASC, [deleted_at] ASC) WHERE ([deleted_at] IS NULL);


GO

CREATE NONCLUSTERED INDEX [IX_kwi_parent]
    ON [k].[node]([parent_id] ASC) WHERE ([deleted_at] IS NULL);


GO


