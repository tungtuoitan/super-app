CREATE TABLE [k].[test] (
    [id]           INT            IDENTITY (1, 1) NOT NULL,
    [knowledge_id] INT            NOT NULL,
    [title]        NVARCHAR (255) NOT NULL,
    [level]        INT            CONSTRAINT [DF_ktest_level] DEFAULT ((1)) NOT NULL,
    [status]       NVARCHAR (50)  CONSTRAINT [DF_ktest_status] DEFAULT ('active') NULL,
    [created_at]   DATETIME2 (7)  CONSTRAINT [DF_ktest_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]   DATETIME2 (7)  NULL,
    [deleted_at]   DATETIME2 (7)  NULL,
    [user_id]      INT            DEFAULT ((0)) NOT NULL,
    [mode]         NVARCHAR (50)  DEFAULT ('standard') NULL,
    CONSTRAINT [PK_ktest] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ktest_knowledge] FOREIGN KEY ([knowledge_id]) REFERENCES [k].[knowledge] ([id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_ktest_knowledge]
    ON [k].[test]([knowledge_id] ASC) WHERE ([deleted_at] IS NULL);


GO
