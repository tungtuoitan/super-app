CREATE TABLE [dbo].[standard_registries] (
    [id]                 INT            IDENTITY (1, 1) NOT NULL,
    [description]        NVARCHAR (500) NULL,
    [is_active]          BIT            DEFAULT ((1)) NULL,
    [created_date]       DATETIME2 (7)  DEFAULT (getutcdate()) NULL,
    [code]               NVARCHAR (200) DEFAULT ('') NOT NULL,
    [type]               NVARCHAR (200) DEFAULT ('') NOT NULL,
    [json_detail]        NVARCHAR (MAX) NULL,
    [created_by]         NVARCHAR (255) NULL,
    [last_modified_by]   NVARCHAR (255) NULL,
    [last_modified_date] DATETIME       NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_standard_registries_code_type] UNIQUE NONCLUSTERED ([code] ASC, [type] ASC)
);


GO

