CREATE TABLE [k].[question] (
    [id]          INT            IDENTITY (1, 1) NOT NULL,
    [test_id]     INT            NOT NULL,
    [name]        NVARCHAR (500) NOT NULL,
    [description] NVARCHAR (MAX) NULL,
    [is_active]   BIT            CONSTRAINT [DF_kquestion_is_active] DEFAULT ((1)) NOT NULL,
    [sort_order]  INT            CONSTRAINT [DF_kquestion_sort_order] DEFAULT ((0)) NOT NULL,
    [created_at]  DATETIME2 (7)  CONSTRAINT [DF_kquestion_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]  DATETIME2 (7)  NULL,
    [deleted_at]  DATETIME2 (7)  NULL,
    CONSTRAINT [PK_kquestion] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_kquestion_test] FOREIGN KEY ([test_id]) REFERENCES [k].[test] ([id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_kquestion_test]
    ON [k].[question]([test_id] ASC) WHERE ([deleted_at] IS NULL);


GO
