CREATE TABLE [k].[test_attempt] (
    [id]           INT            IDENTITY (1, 1) NOT NULL,
    [test_id]      INT            NULL,
    [user_id]      INT            NOT NULL,
    [knowledge_id] INT            NOT NULL,
    [mode]         NVARCHAR (50)  CONSTRAINT [DF_kattempt_mode] DEFAULT ('standard') NOT NULL,
    [started_at]   DATETIME2 (7)  CONSTRAINT [DF_kattempt_started_at] DEFAULT (getutcdate()) NOT NULL,
    [completed_at] DATETIME2 (7)  NULL,
    [total_score]  INT            NULL,
    [max_score]    INT            NULL,
    [ai_feedback]  NVARCHAR (MAX) NULL,
    [status]       NVARCHAR (50)  CONSTRAINT [DF_kattempt_status] DEFAULT ('in_progress') NOT NULL,
    CONSTRAINT [PK_kattempt] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_kattempt_test] FOREIGN KEY ([test_id]) REFERENCES [k].[test] ([id]),
    CONSTRAINT [FK_kattempt_knowledge] FOREIGN KEY ([knowledge_id]) REFERENCES [k].[knowledge] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_kattempt_user_knowledge]
    ON [k].[test_attempt]([user_id] ASC, [knowledge_id] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_kattempt_test]
    ON [k].[test_attempt]([test_id] ASC) WHERE ([test_id] IS NOT NULL);


GO
