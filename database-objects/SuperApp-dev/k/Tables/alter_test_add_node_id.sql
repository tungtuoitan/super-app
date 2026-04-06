ALTER TABLE [k].[test]
    ADD [node_id] INT NULL;
GO

ALTER TABLE [k].[test]
    ADD CONSTRAINT [FK_ktest_node] FOREIGN KEY ([node_id]) REFERENCES [k].[node] ([id]) ON DELETE NO ACTION;
GO

CREATE NONCLUSTERED INDEX [IX_ktest_node]
    ON [k].[test]([knowledge_id] ASC, [node_id] ASC) WHERE ([deleted_at] IS NULL);
GO
