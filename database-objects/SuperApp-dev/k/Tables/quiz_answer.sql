CREATE TABLE [k].[quiz_answer] (
    [id]          INT            IDENTITY (1, 1) NOT NULL,
    [attempt_id]  INT            NOT NULL,
    [quiz_id]     INT            NOT NULL,
    [answer_text] NVARCHAR (MAX) NULL,
    [score]       INT            NULL,
    [score_level] NVARCHAR (20)  NULL,
    [ai_feedback] NVARCHAR (MAX) NULL,
    [status]      NVARCHAR (20)  CONSTRAINT [DF_kquizanswer_status] DEFAULT ('pending') NOT NULL,
    [answered_at] DATETIME2 (7)  NULL,
    CONSTRAINT [PK_kquizanswer] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_kquizanswer] UNIQUE ([attempt_id], [quiz_id]),
    CONSTRAINT [FK_kquizanswer_attempt] FOREIGN KEY ([attempt_id]) REFERENCES [k].[test_attempt] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_kquizanswer_quiz] FOREIGN KEY ([quiz_id]) REFERENCES [k].[quiz] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_kquizanswer_attempt]
    ON [k].[quiz_answer]([attempt_id] ASC);


GO
