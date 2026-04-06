CREATE TABLE [k].[point_history] (
    [id]          INT            IDENTITY (1, 1) NOT NULL,
    [test_id]     INT            NOT NULL,
    [user_id]     INT            NOT NULL,
    [question_id] INT            NULL,
    [answer_text] NVARCHAR (MAX) NULL,
    [point]       INT            DEFAULT ((0)) NOT NULL,
    [created_at]  DATETIME2 (7)  DEFAULT (getutcdate()) NOT NULL
);
GO

CREATE NONCLUSTERED INDEX [IX_k_point_history_test_user]
    ON [k].[point_history]([test_id] ASC, [user_id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_k_point_history_user_question]
    ON [k].[point_history]([user_id] ASC, [question_id] ASC);
GO

ALTER TABLE [k].[point_history]
    ADD CONSTRAINT [FK_k_point_history_test] FOREIGN KEY ([test_id]) REFERENCES [k].[test] ([id]) ON DELETE CASCADE;
GO

ALTER TABLE [k].[point_history]
    ADD CONSTRAINT [PK_k_point_history] PRIMARY KEY CLUSTERED ([id] ASC);
GO
