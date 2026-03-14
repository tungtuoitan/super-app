CREATE TABLE [dbo].[files] (
    [id]                   INT             IDENTITY (1, 1) NOT NULL,
    [user_id]              INT             NOT NULL,
    [name]                 NVARCHAR (255)  NOT NULL,
    [url]                  NVARCHAR (1000) NULL,
    [file_size]            BIGINT          NULL,
    [mime_type]            NVARCHAR (100)  NULL,
    [extension]            NVARCHAR (20)   NULL,
    [status_code]          NVARCHAR (200)  NULL,
    [created_at]           DATETIME        DEFAULT (getutcdate()) NULL,
    [updated_at]           DATETIME        NULL,
    [deleted_at]           DATETIME        NULL,
    [color]                VARCHAR (20)    NULL,
    [icon]                 VARCHAR (20)    NULL,
    [google_drive_file_id] NVARCHAR (100)  NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_files_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [urm].[users] ([id])
);


GO

CREATE NONCLUSTERED INDEX [IX_files_drive_file_id]
    ON [dbo].[files]([google_drive_file_id] ASC) WHERE ([google_drive_file_id] IS NOT NULL);


GO

