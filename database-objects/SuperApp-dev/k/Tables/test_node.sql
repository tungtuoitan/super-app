CREATE TABLE [k].[test_node] (
    [id]        INT IDENTITY (1, 1) NOT NULL,
    [test_id]   INT NOT NULL,
    [node_id]   INT NOT NULL,
    [is_active] BIT DEFAULT ((1)) NOT NULL
);
GO

CREATE NONCLUSTERED INDEX [IX_k_test_node_node]
    ON [k].[test_node]([node_id] ASC);
GO

ALTER TABLE [k].[test_node]
    ADD CONSTRAINT [PK_k_test_node] PRIMARY KEY CLUSTERED ([id] ASC);
GO

ALTER TABLE [k].[test_node]
    ADD CONSTRAINT [FK_k_test_node_test] FOREIGN KEY ([test_id]) REFERENCES [k].[test] ([id]) ON DELETE CASCADE;
GO

ALTER TABLE [k].[test_node]
    ADD CONSTRAINT [UQ_k_test_node_test_node] UNIQUE NONCLUSTERED ([test_id] ASC, [node_id] ASC);
GO

