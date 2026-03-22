-- Create task_checklist_history table
-- Stores daily checklist snapshots for repeat-checklist (build-habit)
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'pro' AND t.name = 'task_checklist_history'
)
CREATE TABLE [pro].[task_checklist_history] (
    [id]                  INT            IDENTITY(1,1) NOT NULL,
    [task_id]             INT            NOT NULL,
    [date]                DATE           NOT NULL,
    [checklist_snapshot]  NVARCHAR(MAX)  NOT NULL,
    [created_at]          DATETIME2(3)   DEFAULT (sysdatetime()) NOT NULL,
    CONSTRAINT [PK_task_checklist_history] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_task_checklist_history_task] FOREIGN KEY ([task_id]) REFERENCES [pro].[task]([id]),
    CONSTRAINT [UQ_task_checklist_history_task_date] UNIQUE ([task_id], [date])
);
