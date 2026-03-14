CREATE TABLE [dbo].[entity_hashtags] (
    [id]          INT           IDENTITY (1, 1) NOT NULL,
    [entity_type] TINYINT       NOT NULL,
    [entity_id]   INT           NOT NULL,
    [hashtag_id]  INT           NOT NULL,
    [created_at]  DATETIME2 (7) DEFAULT (getutcdate()) NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_entity_hashtags_hashtag] FOREIGN KEY ([hashtag_id]) REFERENCES [dbo].[hashtags] ([id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_entity_hashtags_unique] UNIQUE NONCLUSTERED ([hashtag_id] ASC, [entity_type] ASC, [entity_id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_entity_hashtags_entity]
    ON [dbo].[entity_hashtags]([entity_type] ASC, [entity_id] ASC);


GO

