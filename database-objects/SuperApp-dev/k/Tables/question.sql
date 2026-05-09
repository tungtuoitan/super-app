CREATE TABLE [k].[question] (
    [id]                 INT            IDENTITY (1, 1) NOT NULL,
    [name]               NVARCHAR (500) NOT NULL,
    [description]        NVARCHAR (MAX) NULL,
    [sort_order]         INT            CONSTRAINT [DF_kquestion_sort_order] DEFAULT ((0)) NOT NULL,
    [created_at]         DATETIME2 (7)  CONSTRAINT [DF_kquestion_created_at] DEFAULT (getutcdate()) NOT NULL,
    [updated_at]         DATETIME2 (7)  NULL,
    [deleted_at]         DATETIME2 (7)  NULL,
    [srs_interval]       INT            DEFAULT ((0)) NOT NULL,
    [srs_ease_factor]    FLOAT (53)     DEFAULT ((2.5)) NOT NULL,
    [srs_repetitions]    INT            DEFAULT ((0)) NOT NULL,
    [srs_next_review_at] DATETIME2 (7)  NULL,
    [node_id]            INT            NULL,
    [status_code]        NVARCHAR (50)  NOT NULL,
    CONSTRAINT [PK_kquestion] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_k_question_node] FOREIGN KEY ([node_id]) REFERENCES [k].[node] ([id]) ON DELETE SET NULL
);


GO

ALTER TABLE [k].[question]
    ADD CONSTRAINT [FK_k_question_node] FOREIGN KEY ([node_id]) REFERENCES [k].[node] ([id]) ON DELETE SET NULL;
GO


CREATE NONCLUSTERED INDEX [IX_k_question_node]
    ON [k].[question]([node_id] ASC);
GO

