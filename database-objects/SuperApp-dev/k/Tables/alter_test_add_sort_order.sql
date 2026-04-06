ALTER TABLE [k].[test]
    ADD [sort_order] INT NOT NULL CONSTRAINT [DF_ktest_sort_order] DEFAULT (0);
GO
