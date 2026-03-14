CREATE TABLE [pro].[TargetKeywords] (
    [Id]         INT           IDENTITY (1, 1) NOT NULL,
    [TargetId]   INT           NOT NULL,
    [TargetType] VARCHAR (20)  NOT NULL,
    [KeywordId]  INT           NOT NULL,
    [CreatedAt]  DATETIME2 (7) CONSTRAINT [DF_TargetKeywords_CreatedAt] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_TargetKeywords] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO

