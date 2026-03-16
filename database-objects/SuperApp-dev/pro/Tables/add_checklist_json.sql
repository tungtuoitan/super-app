-- Migration: Add checklist_json column to pro.task
-- Stores checklist definition + state as JSON: { "groups": [...] }
ALTER TABLE [pro].[task]
    ADD [checklist_json] NVARCHAR(MAX) NULL;
GO
