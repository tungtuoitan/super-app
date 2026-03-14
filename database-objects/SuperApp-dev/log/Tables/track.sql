CREATE TABLE [log].[track] (
    [id]           INT            IDENTITY (1, 1) NOT NULL,
    [user_id]      INT            NOT NULL,
    [name]         NVARCHAR (255) NOT NULL,
    [emoji]        NVARCHAR (MAX) NULL,
    [description]  NVARCHAR (MAX) NULL,
    [is_sensitive] BIT            CONSTRAINT [DF_log_track_is_sensitive] DEFAULT ((0)) NOT NULL,
    [color]        NVARCHAR (50)  NULL,
    [created_at]   DATETIME2 (7)  CONSTRAINT [DF_log_track_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]   DATETIME2 (7)  CONSTRAINT [DF_log_track_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]   DATETIME2 (7)  NULL,
    CONSTRAINT [PK_log_track] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_log_track_deleted_at]
    ON [log].[track]([deleted_at] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_log_track_user_id]
    ON [log].[track]([user_id] ASC);


GO

