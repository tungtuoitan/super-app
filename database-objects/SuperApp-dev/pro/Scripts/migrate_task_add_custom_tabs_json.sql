-- Migration: Add custom_tabs_json column to pro.task
-- Stores user-created custom tabs with name/version/content as JSON: { "tabs": [...] }
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pro.task') AND name = 'custom_tabs_json')
    ALTER TABLE pro.task ADD custom_tabs_json NVARCHAR(MAX) NULL;
