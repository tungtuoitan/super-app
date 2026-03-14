CREATE TABLE [dbo].[Keywords] (
    [Id]            INT             IDENTITY (1, 1) NOT NULL,
    [UserId]        INT             NOT NULL,
    [Name]          NVARCHAR (255)  NOT NULL,
    [Type]          NVARCHAR (50)   NOT NULL,
    [TargetItemId]  INT             NULL,
    [Link]          NVARCHAR (2000) NOT NULL,
    [Description]   NVARCHAR (MAX)  NULL,
    [CreatedAt]     DATETIME2 (7)   DEFAULT (getutcdate()) NOT NULL,
    [UpdatedAt]     DATETIME2 (7)   NULL,
    [HardDeletedAt] DATETIME2 (7)   NULL,
    CONSTRAINT [PK_Keywords] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Keywords_Users] FOREIGN KEY ([UserId]) REFERENCES [urm].[users] ([id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_Keywords_Link] UNIQUE NONCLUSTERED ([Link] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_Keywords_Type]
    ON [dbo].[Keywords]([Type] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_Keywords_UserId]
    ON [dbo].[Keywords]([UserId] ASC);


GO

