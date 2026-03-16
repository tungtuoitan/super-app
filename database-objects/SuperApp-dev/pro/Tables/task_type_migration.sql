-- =============================================
-- Migration: Add task_type column to pro.task
-- =============================================
ALTER TABLE [pro].[task]
    ADD [task_type] NVARCHAR (50) CONSTRAINT [df_task_task_type] DEFAULT ('personal') NOT NULL;
GO
