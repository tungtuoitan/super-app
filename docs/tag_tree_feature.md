Tag-Tree System Design for SQL Server
1. Overview
We want a hierarchical tag system (a tree where tags can have parent-child relationships) that can be attached to any kind of content (files, notes, tasks, etc.).
The design draws inspiration from popular products:



ProductKey Idea we borrowedTagSpacesJSON-based tag library, side-car metadata, offline-first.EvernoteMany-to-many tag → note mapping, notebooks as a hard hierarchy, client-side nesting.LogicalDOCHierarchical taxonomies + auto-classification rules.ContentfulPolymorphic taxonomy fields, controlled vocabularies, GraphQL-friendly.M-FilesMetadata-driven hierarchies replace folders, workflow triggers on tags.
This document focuses only on the description and SQL code for SQL Server. No backend code is included.
SQL Server does not have a built-in ltree extension like PostgreSQL, so we use a NVARCHAR column for the materialized path (e.g., 'Work.ProjectX').
Subtree queries use LIKE (e.g., WHERE path LIKE 'Work.%'). For better performance on large trees, consider adding indexes or a closure table later.

2. Database Schema (SQL Server)
sql-- Tags table – stores the tag tree
CREATE TABLE tags (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(255) NOT NULL UNIQUE,
    parent_id   INT NULL FOREIGN KEY REFERENCES tags(id) ON DELETE CASCADE,
    path        NVARCHAR(4000) NULL,  -- Materialized path, e.g., 'Work.ProjectX'
    description NVARCHAR(MAX) NULL,
    created_at  DATETIME DEFAULT GETDATE()
);

-- Index for subtree queries (using LIKE)
CREATE NONCLUSTERED INDEX idx_tags_path ON tags (path);

-- Trigger to auto-update the materialized path on insert/update
CREATE OR ALTER TRIGGER trg_update_tag_path
ON tags
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Update path for inserted/updated rows
    UPDATE t
    SET t.path = CASE
                    WHEN i.parent_id IS NULL THEN i.name
                    ELSE p.path + '.' + i.name
                 END
    FROM tags t
    INNER JOIN inserted i ON t.id = i.id
    LEFT JOIN tags p ON i.parent_id = p.id;
END;

-- Junction table – polymorphic many-to-many mapping
CREATE TABLE taggables (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    tag_id         INT NOT NULL FOREIGN KEY REFERENCES tags(id) ON DELETE CASCADE,
    taggable_id    BIGINT NOT NULL,
    taggable_type  NVARCHAR(50) NOT NULL,
    created_at     DATETIME DEFAULT GETDATE(),
    CONSTRAINT uq_taggables UNIQUE (tag_id, taggable_id, taggable_type)
);

-- Optional: Rules engine for automation
CREATE TABLE tag_rules (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    tag_id     INT FOREIGN KEY REFERENCES tags(id) ON DELETE CASCADE,
    rule_type  NVARCHAR(50) NOT NULL,   -- e.g., 'auto-assign', 'workflow'
    condition  NVARCHAR(MAX) NULL,      -- Flexible condition payload (JSON-like string)
    created_at DATETIME DEFAULT GETDATE()
);
Example Content Tables
sqlCREATE TABLE notes (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    content    NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE files (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    file_path  NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

3. Core Concepts
3.1 taggable (Polymorphic Association)

Description: A junction table for many-to-many relationships between tags and any content type (e.g., notes, files).
It uses polymorphism: taggable_type specifies the type (e.g., 'Note'), and taggable_id references the ID in that table.
This allows attaching tags to multiple entity types without schema changes.
Benefits: Centralized management, easy to query across types, scalable for hierarchy.
Sample Query: Find all files with tag 'Work' or any descendant:
sqlSELECT f.*
FROM files f
JOIN taggables t ON t.taggable_id = f.id AND t.taggable_type = 'File'
JOIN tags tg ON tg.id = t.tag_id
WHERE tg.path LIKE 'Work.%';


3.2 tag_rules (Automation Engine)

Description: Optional table for storing rules that automate tag assignment or actions.
Rules can be evaluated in your application logic (e.g., triggers or stored procedures).
condition stores JSON-like strings for flexibility (e.g., '{"parent_tag": "Work", "add_child": "ProjectX"}').
Common uses: Auto-assign child tags, classify based on content, trigger workflows.
Common Rule Types:








Rule TypeDescriptionExampleauto-assign-childAttach parent → auto-add children.Attach 'Work' → add 'Work:ProjectX'.auto-classifyTag by metadata/keywords.PDF with “Invoice” → 'Finance:Invoice'.workflow-triggerTag triggers action.'Urgent' → notify admin.cleanupRemove/replace on change.Delete 'OldProject' → replace with 'Archive'.access-controlPermissions by tag.'Confidential' → restrict view.

Implementation Note: Add rules later; evaluate in app code or via triggers. Example trigger for auto-assign:
sqlCREATE OR ALTER TRIGGER trg_apply_tag_rules
ON taggables
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Simple example: If rule exists for auto-assign, insert child tag
    INSERT INTO taggables (tag_id, taggable_id, taggable_type)
    SELECT 
        (SELECT id FROM tags WHERE path = JSON_VALUE(r.condition, '$.add_child')),
        i.taggable_id,
        i.taggable_type
    FROM inserted i
    JOIN tag_rules r ON i.tag_id = r.tag_id
    WHERE r.rule_type = 'auto-assign';
END;



4. Decision: Direct Tag Column vs Junction Table












ApproachProsConsWhen to UseDirect column (tags NVARCHAR in each table)Simpler for tiny apps, no joins.Hard to enforce uniqueness/hierarchy, schema changes for new types.Small projects, flat tags, single entity.Junction table (taggables)Polymorphic, central management, efficient queries, extensible.More joins, extra table.Tag tree, multiple entities, automation (recommended).
Recommendation: Use taggables for your hierarchical, multi-entity needs.

5. Conversation Summary (for future reference)

User: “I want a tag-tree system for files, notes, etc. Which existing sites do something similar?”
Assistant: Listed TagSpaces, Evernote, LogicalDOC, Contentful, M-Files and extracted best-practices.


User: “Design the DB, learn from those sites.”
Assistant: Proposed schema, explained taggable and tag_rules.


User: “Should I put a tag column directly in Note/File tables or use a junction table?”
Assistant: Recommended junction table (taggables) for flexibility and hierarchy support.


User: “Common tag rules and can I add them later?”
Assistant: Listed five common rule types and confirmed they can be added later.


User: “Save as markdown, then create Tags Tree project with this conversation.”
Assistant: Provided markdown with PostgreSQL schema and project skeleton.


User: “Only description and SQL code, no backend, and I use SQL Server.”
Assistant: This document – updated for SQL Server.

