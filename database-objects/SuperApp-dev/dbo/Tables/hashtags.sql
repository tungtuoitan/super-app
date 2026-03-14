CREATE TABLE [dbo].[hashtags] (
    [id]          INT            IDENTITY (1, 1) NOT NULL,
    [user_id]     INT            NOT NULL,
    [name]        NVARCHAR (100) NOT NULL,
    [usage_count] INT            DEFAULT ((0)) NULL,
    [created_at]  DATETIME2 (7)  DEFAULT (getutcdate()) NULL,
    [updated_at]  DATETIME2 (7)  NULL,
    [deleted_at]  DATETIME2 (7)  NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_hashtags_user] FOREIGN KEY ([user_id]) REFERENCES [urm].[users] ([id]),
    CONSTRAINT [UQ_hashtags_user_name] UNIQUE NONCLUSTERED ([user_id] ASC, [name] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_hashtags_name]
    ON [dbo].[hashtags]([name] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_hashtags_user]
    ON [dbo].[hashtags]([user_id] ASC) WHERE ([deleted_at] IS NULL);


GO

