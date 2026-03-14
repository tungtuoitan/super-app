CREATE TABLE [log].[log] (
    [id]           INT            IDENTITY (1, 1) NOT NULL,
    [user_id]      INT            NOT NULL,
    [type]         NVARCHAR (50)  NOT NULL,
    [track_id]     INT            NULL,
    [title]        NVARCHAR (255) NULL,
    [description]  NVARCHAR (MAX) NULL,
    [is_sensitive] BIT            CONSTRAINT [DF_log_log_is_sensitive] DEFAULT ((0)) NOT NULL,
    [location]     NVARCHAR (255) NULL,
    [created_at]   DATETIME2 (7)  CONSTRAINT [DF_log_log_created_at] DEFAULT (sysdatetime()) NOT NULL,
    [updated_at]   DATETIME2 (7)  CONSTRAINT [DF_log_log_updated_at] DEFAULT (sysdatetime()) NOT NULL,
    [deleted_at]   DATETIME2 (7)  NULL,
    [occur_at]     DATETIME2 (7)  NULL,
    CONSTRAINT [PK_log_log] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_log_log_track] FOREIGN KEY ([track_id]) REFERENCES [log].[track] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_log_log_type]
    ON [log].[log]([type] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_log_log_track_id]
    ON [log].[log]([track_id] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_log_log_created_at]
    ON [log].[log]([created_at] DESC);


GO

CREATE NONCLUSTERED INDEX [IX_log_log_user_id]
    ON [log].[log]([user_id] ASC);


GO

