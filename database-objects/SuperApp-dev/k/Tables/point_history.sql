CREATE TABLE [k].[point_history] (
    [id]               INT            IDENTITY (1, 1) NOT NULL,
    [user_id]          INT            NOT NULL,
    [answer_text]      NVARCHAR (MAX) NULL,
    [point]            INT            DEFAULT ((0)) NOT NULL,
    [created_at]       DATETIME2 (7)  DEFAULT (getutcdate()) NOT NULL,
    [question_id]      INT            NULL,
    [response_time_ms] INT            NULL,
    [knowledge_id]     INT            NULL,
    CONSTRAINT [PK_k_point_history] PRIMARY KEY CLUSTERED ([id] ASC)
);
GO

ALTER TABLE [k].[point_history]
    ADD CONSTRAINT [PK_k_point_history] PRIMARY KEY CLUSTERED ([id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_k_point_history_knowledge_user]
    ON [k].[point_history]([knowledge_id] ASC, [user_id] ASC);
GO

