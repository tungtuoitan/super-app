CREATE TABLE [k].[quiz] (
    [id]         INT            IDENTITY (1, 1) NOT NULL,
    [test_id]    INT            NOT NULL,
    [question]   NVARCHAR (MAX) NOT NULL,
    [level]      INT            CONSTRAINT [DF_kquiz_level] DEFAULT ((1)) NOT NULL,
    [tag]        NVARCHAR (255) NULL,
    [point]      INT            CONSTRAINT [DF_kquiz_point] DEFAULT ((10)) NOT NULL,
    [status]     NVARCHAR (50)  CONSTRAINT [DF_kquiz_status] DEFAULT ('active') NULL,
    [created_at] DATETIME2 (7)  CONSTRAINT [DF_kquiz_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at] DATETIME2 (7)  NULL,
    [deleted_at] DATETIME2 (7)  NULL,
    CONSTRAINT [PK_kquiz] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_kquiz_test] FOREIGN KEY ([test_id]) REFERENCES [k].[test] ([id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_kquiz_test]
    ON [k].[quiz]([test_id] ASC) WHERE ([deleted_at] IS NULL);


GO
