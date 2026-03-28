ALTER TABLE [k].[node]
    ADD [type]   NVARCHAR (50) NULL,
        [point]  INT           CONSTRAINT [DF_knode_point] DEFAULT ((10)) NULL,
        [status] NVARCHAR (50) CONSTRAINT [DF_knode_status] DEFAULT ('active') NULL;


GO
