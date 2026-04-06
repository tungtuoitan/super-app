CREATE TABLE [k].[test] (
    [id]           INT            IDENTITY (1, 1) NOT NULL,
    [knowledge_id] INT            NOT NULL,
    [node_id]      INT            NULL,
    [title]        NVARCHAR (255) NOT NULL,
    [level]        INT            CONSTRAINT [DF_ktest_level] DEFAULT ((1)) NOT NULL,
    [status]       NVARCHAR (50)  CONSTRAINT [DF_ktest_status] DEFAULT ('active') NULL,
    [created_at]   DATETIME2 (7)  CONSTRAINT [DF_ktest_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]   DATETIME2 (7)  NULL,
    [deleted_at]   DATETIME2 (7)  NULL,
    [user_id]      INT            DEFAULT ((0)) NOT NULL,
    [mode]         NVARCHAR (50)  DEFAULT ('standard') NULL,
    [sort_order]   INT            CONSTRAINT [DF_ktest_sort_order] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_ktest] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ktest_knowledge] FOREIGN KEY ([knowledge_id]) REFERENCES [k].[knowledge] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ktest_node] FOREIGN KEY ([node_id]) REFERENCES [k].[node] ([id]) ON DELETE NO ACTION
);


GO

CREATE NONCLUSTERED INDEX [IX_ktest_knowledge]
    ON [k].[test]([knowledge_id] ASC) WHERE ([deleted_at] IS NULL);


GO

CREATE NONCLUSTERED INDEX [IX_ktest_node]
    ON [k].[test]([knowledge_id] ASC, [node_id] ASC) WHERE ([deleted_at] IS NULL);


GO
