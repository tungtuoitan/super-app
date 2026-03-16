-- Migration: Add task_type column to pro.task
-- Run this once on existing database

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pro.task') AND name = 'task_type'
)
BEGIN
    ALTER TABLE [pro].[task]
        ADD [task_type] NVARCHAR(50) CONSTRAINT [df_task_task_type] DEFAULT ('personal') NOT NULL;

    PRINT 'Column task_type added to pro.task successfully.';
END
ELSE
BEGIN
    PRINT 'Column task_type already exists in pro.task. Skipping.';
END
GO
