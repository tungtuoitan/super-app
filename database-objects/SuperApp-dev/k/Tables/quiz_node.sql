CREATE TABLE [k].[quiz_node] (
    [id]      INT IDENTITY (1, 1) NOT NULL,
    [quiz_id] INT NOT NULL,
    [node_id] INT NOT NULL,
    CONSTRAINT [PK_kquiznode] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_kquiznode] UNIQUE ([quiz_id], [node_id]),
    CONSTRAINT [FK_kquiznode_quiz] FOREIGN KEY ([quiz_id]) REFERENCES [k].[quiz] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_kquiznode_node] FOREIGN KEY ([node_id]) REFERENCES [k].[node] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_kquiznode_quiz]
    ON [k].[quiz_node]([quiz_id] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_kquiznode_node]
    ON [k].[quiz_node]([node_id] ASC);


GO
