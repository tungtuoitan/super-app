-- Migration: track when a node (topic/test) enters "learning" and "mastered" state
-- Backend sets mastered_at when all questions in the node have high retention (backend logic)
-- Backend sets learning_started_at when first question in the node is reviewed

ALTER TABLE [k].[node]
    ADD [mastered_at]        DATETIME2 (7) NULL,
        [learning_started_at] DATETIME2 (7) NULL;
GO
