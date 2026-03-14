CREATE TABLE [urm].[user_profiles] (
    [id]            INT             IDENTITY (1, 1) NOT NULL,
    [user_id]       INT             NOT NULL,
    [first_name]    NVARCHAR (100)  NULL,
    [last_name]     NVARCHAR (100)  NULL,
    [avatar_url]    NVARCHAR (500)  NULL,
    [bio]           NVARCHAR (1000) NULL,
    [date_of_birth] DATE            NULL,
    [gender]        NVARCHAR (10)   NULL,
    [country]       NVARCHAR (100)  NULL,
    [city]          NVARCHAR (100)  NULL,
    [timezone]      NVARCHAR (50)   DEFAULT ('UTC') NULL,
    [language]      NVARCHAR (10)   DEFAULT ('en') NULL,
    [created_at]    DATETIME2 (7)   DEFAULT (getutcdate()) NULL,
    [updated_at]    DATETIME2 (7)   NULL,
    [filters]       NVARCHAR (MAX)  NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_user_profiles_user] FOREIGN KEY ([user_id]) REFERENCES [urm].[users] ([id]) ON DELETE CASCADE,
    UNIQUE NONCLUSTERED ([user_id] ASC)
);


GO

