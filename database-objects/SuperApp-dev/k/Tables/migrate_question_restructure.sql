-- Migration: Create k.question table, migrate data from k.test_node, then drop k.test_node
-- Run this AFTER creating the k.question table (question.sql)

-- Step 1: Migrate existing test_node data into k.question
-- Each test_node references a node (question type) — copy name/description from k.node
INSERT INTO [k].[question] ([test_id], [name], [description], [is_active], [sort_order])
SELECT
    tn.[test_id],
    n.[name],
    n.[description],
    tn.[is_active],
    0
FROM [k].[test_node] tn
INNER JOIN [k].[node] n ON n.[id] = tn.[node_id];
GO

-- Step 2: Migrate point_history — add question_id, map from old node_id via test_node
ALTER TABLE [k].[point_history] ADD [question_id] INT NULL;
GO

UPDATE ph
SET ph.[question_id] = q.[id]
FROM [k].[point_history] ph
INNER JOIN [k].[test_node] tn ON tn.[test_id] = ph.[test_id] AND tn.[node_id] = ph.[node_id]
INNER JOIN [k].[question] q ON q.[test_id] = tn.[test_id] AND q.[name] = (
    SELECT TOP 1 n2.[name] FROM [k].[node] n2 WHERE n2.[id] = tn.[node_id]
);
GO

-- Step 3: Drop old node_id column + index from point_history
DROP INDEX IF EXISTS [IX_k_point_history_user_node] ON [k].[point_history];
GO

ALTER TABLE [k].[point_history] DROP COLUMN [node_id];
GO

CREATE NONCLUSTERED INDEX [IX_k_point_history_user_question]
    ON [k].[point_history]([user_id] ASC, [question_id] ASC);
GO

-- Step 4: Drop k.test_node
DROP TABLE [k].[test_node];
GO

-- Step 5: Remove node_type from k.node (all nodes are now entity/keyword only)
-- First delete question-type nodes (they've been migrated to k.question)
DELETE FROM [k].[node] WHERE [node_type] = 'question';
GO

ALTER TABLE [k].[node] DROP COLUMN [node_type];
GO
