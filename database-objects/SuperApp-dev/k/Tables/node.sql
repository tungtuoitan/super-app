CREATE TABLE [k].[node] (
    [id]           INT             IDENTITY (1, 1) NOT NULL,
    [knowledge_id] INT             NOT NULL,
    [parent_id]    INT             NULL,
    [created_at]   DATETIME2 (7)   CONSTRAINT [DF_kwi_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]   DATETIME2 (7)   NULL,
    [deleted_at]   DATETIME2 (7)   NULL,
    [PathIds]      NVARCHAR (1000) CONSTRAINT [DF_kwi_PathIds] DEFAULT ('/') NOT NULL,
    [PathDepth]    INT             CONSTRAINT [DF_kwi_PathDepth] DEFAULT ((0)) NOT NULL,
    [name]         NVARCHAR (255)  DEFAULT ('') NOT NULL,
    [description]  NVARCHAR (MAX)  NULL,
    [color]        NVARCHAR (7)    DEFAULT ('#F59E0B') NULL,
    [icon]         NVARCHAR (50)   DEFAULT (N'📁') NULL,
    CONSTRAINT [PK_kworkspace_items] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [CK_kwi_MaxDepth] CHECK ([PathDepth]<=(30)),
    CONSTRAINT [FK_kwi_parent] FOREIGN KEY ([parent_id]) REFERENCES [k].[node] ([id]),
    CONSTRAINT [FK_kwi_workspace] FOREIGN KEY ([knowledge_id]) REFERENCES [k].[knowledge] ([id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_kwi_path]
    ON [k].[node]([PathIds] ASC, [PathDepth] ASC) WHERE ([deleted_at] IS NULL);


GO

CREATE NONCLUSTERED INDEX [IX_kwi_workspace]
    ON [k].[node]([knowledge_id] ASC, [deleted_at] ASC) WHERE ([deleted_at] IS NULL);


GO

CREATE NONCLUSTERED INDEX [IX_kwi_parent]
    ON [k].[node]([parent_id] ASC) WHERE ([deleted_at] IS NULL);


GO

