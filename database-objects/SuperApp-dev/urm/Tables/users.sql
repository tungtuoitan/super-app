CREATE TABLE [urm].[users] (
    [id]                      INT             IDENTITY (1, 1) NOT NULL,
    [email]                   NVARCHAR (255)  NOT NULL,
    [phone]                   NVARCHAR (20)   NULL,
    [password]                NVARCHAR (255)  NOT NULL,
    [auth_type]               NVARCHAR (50)   DEFAULT ('local') NULL,
    [is_active]               BIT             DEFAULT ((1)) NULL,
    [last_login_at]           DATETIME2 (7)   NULL,
    [created_at]              DATETIME2 (7)   DEFAULT (getutcdate()) NULL,
    [updated_at]              DATETIME2 (7)   NULL,
    [deleted_at]              DATETIME2 (7)   NULL,
    [google_access_token]     NVARCHAR (2048) NULL,
    [google_refresh_token]    NVARCHAR (512)  NULL,
    [google_token_expires_at] DATETIME2 (7)   NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    UNIQUE NONCLUSTERED ([email] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_users_email]
    ON [urm].[users]([email] ASC) WHERE ([deleted_at] IS NULL);


GO

CREATE NONCLUSTERED INDEX [IX_users_phone]
    ON [urm].[users]([phone] ASC) WHERE ([deleted_at] IS NULL);


GO

