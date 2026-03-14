CREATE TABLE [auth].[refresh_tokens] (
    [id]                     INT            IDENTITY (1, 1) NOT NULL,
    [token_hash]             NVARCHAR (256) NOT NULL,
    [user_id]                INT            NOT NULL,
    [expires_at]             DATETIME2 (7)  NOT NULL,
    [created_at]             DATETIME2 (7)  DEFAULT (getutcdate()) NOT NULL,
    [revoked_at]             DATETIME2 (7)  NULL,
    [replaced_by_token_hash] NVARCHAR (256) NULL,
    [device_info]            NVARCHAR (512) NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    FOREIGN KEY ([user_id]) REFERENCES [urm].[users] ([id]) ON DELETE CASCADE
);


GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_refresh_tokens_token_hash]
    ON [auth].[refresh_tokens]([token_hash] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_refresh_tokens_user_id]
    ON [auth].[refresh_tokens]([user_id] ASC);


GO

