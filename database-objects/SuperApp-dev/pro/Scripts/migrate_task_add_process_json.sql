-- Migration: Add process_json column to pro.task
-- Stores process/step definition + state as JSON: { "groups": [...] }
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pro.task') AND name = 'process_json')
    ALTER TABLE pro.task ADD process_json NVARCHAR(MAX) NULL;
