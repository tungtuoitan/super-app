ĐỀ BÀI: 
các file trên là để tham khảo, và file 02-schema là các bảng tôi đã build rồi, 


MỤC ĐÍCH:
- giờ có nhiều kiểu quan hệ giữa các tag: 
- default: là kiểu quan hệ cha con thông thường, 
- thuộc về 1 workspace cụ thể, ví dụ: trong workspace Family ta có
GrandParent A -> Dad B -> Son C
nhưng trong workspace citizen ta lại có: 
Citizen -> A
            -> B
            -> C
- thuộc về 1 diagram: ví dụ tôi muốn vẽ ra diagram từ data: tag để thể hiện quan hệ


-->mỗi quan hệ thuộc về 1 workspace nào đó, hoặc default, hoặc diagram


1. đúng, workspace giống như trong vscode ấy, chứa các tag liên quan với nhau, tạo thành 1 tree. 1 user có thể có nhiều workspace. 1 workspace chỉ xuất hiện 1 tag, và 1 tag có thể có trong nhiều workspace
2. đúng, diagram là sơ đồ thể hiện quan hệ giữa các tag, ví dụ tôi có các tag tương ứng với các bộ phận trong công ty, thì tôi sẽ vẽ ra sơ đồ bằng cách link các tag lại với nhau. diagram cũng là 1 workspace đặc biệt. đặc biệt ở chỗ workspace thông thường thì có 1 root, và nó là tree, còn diagram thì có thể là 1 loop, chằng chéo lẫn nhau, hoặc phức tạp, giống như các sơ đồ trong thế giới thật
user có thể tạo nhiều diagram khác nhau từ 1 bộ tags, khi đó id cảu diagram sẽ khác nhau
3. đúng, 1 tag có thể có nhiều loại quan hệ cha con tuỳ context. đúng, bạn vẽ đúng rồi
4. default chỉ là 1 trong nhiều loại relationship, nó giống như việc gắn tag có 1 bài viết, 1 file, ...nhằm mục đích chính là phân loại
---
các query thường xuyên:
- Lấy tất cả tags trong một workspace cụ thể?
 - Lấy subtree của một tag trong một workspace?
 - Lấy tất cả relationships của một tag (across all workspaces)?
 - insert tag vào 1 tag cha cụ thể
 - update tag,
 -move tag, xoá tag,
 - thêm tag vào workspace/diagram
 ----
 6. 1 workspace chắc có ít hơn 1000 tag,
 1 user chắc có ngày càng tăng workspace, nhưng sẽ k nhiều và k tăng mạnh bằng tag
 2. có thể share workspace (nhưng đây là tính năng nâng cao, có thể implement sau)

------------------------------------------------------------------
-- Tags vẫn là global pool
CREATE TABLE tags (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255),
    color NVARCHAR(7),
    icon NVARCHAR(50),
    description NVARCHAR(MAX),
    
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    deleted_at DATETIME2,
    
    CONSTRAINT fk_tags_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_tags_user_name UNIQUE (user_id, name, deleted_at)
);

CREATE INDEX ix_tags_user ON tags(user_id, deleted_at) WHERE deleted_at IS NULL;



-- ============================================
-- WORKSPACES: Container cho tag contexts
-- ============================================
CREATE TABLE workspaces (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Workspace info
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000),
    color NVARCHAR(7),
    icon NVARCHAR(50),
    
    -- Workspace type & settings
    type NVARCHAR(20) NOT NULL DEFAULT 'hierarchy',
    -- 'hierarchy': Strict tree (parent-child, no cycles)
    -- 'graph': Free-form graph (cycles allowed)
    -- 'network': Network diagram (connections with types)
    -- 'timeline': Temporal relationships
    -- 'custom': Custom relationship types
    
    -- Performance settings
    enable_closure_table BIT DEFAULT 0,
    -- TRUE: Build closure table for fast deep queries (cost: storage)
    -- FALSE: Use recursive queries (cost: compute)
    
    max_depth INT DEFAULT 10,
    -- Limit hierarchy depth for performance
    
    -- Metadata
    is_default BIT DEFAULT 0,
    is_public BIT DEFAULT 0,
    is_template BIT DEFAULT 0,
    
    -- Lifecycle
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    deleted_at DATETIME2 NULL,
    
    CONSTRAINT fk_workspace_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT ck_workspace_type CHECK (type IN ('hierarchy', 'graph', 'network', 'timeline', 'custom')),
    CONSTRAINT uq_workspace_name UNIQUE (user_id, name, deleted_at)
);

CREATE INDEX ix_workspace_user ON workspaces(user_id, type, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX ix_workspace_template ON workspaces(is_template, is_public) WHERE is_template = 1 AND deleted_at IS NULL;-- ============================================
-- WORKSPACE_TAG_RELATIONSHIPS: Context-specific tag relationships
-- ============================================
CREATE TABLE workspace_tag_relationships (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    
    workspace_id INT NOT NULL,
    
    -- Relationship endpoints
    from_tag_id INT NOT NULL,
    to_tag_id INT NOT NULL,
    
    -- Relationship metadata
    relationship_type NVARCHAR(50) DEFAULT 'parent_child',
    -- For 'hierarchy': 'parent_child'
    -- For 'graph': 'connected_to', 'related_to'
    -- For 'network': 'reports_to', 'collaborates_with', 'depends_on'
    -- For 'timeline': 'before', 'after', 'concurrent'
    -- For 'custom': User-defined types
    
    -- Path optimization (materialized path)
    from_path NVARCHAR(4000),  -- e.g., '1.5.10' (ancestor chain for from_tag)
    to_path NVARCHAR(4000),    -- e.g., '1.5.10.15' (ancestor chain for to_tag)
    depth INT DEFAULT 0,       -- Distance from root (for hierarchy)
    
    -- Visual/UI metadata
    sort_order INT DEFAULT 0,
    label NVARCHAR(200),       -- Edge label for diagrams
    color NVARCHAR(7),         -- Edge color
    line_style NVARCHAR(20),   -- 'solid', 'dashed', 'dotted'
    
    -- Relationship properties
    is_bidirectional BIT DEFAULT 0,
    strength DECIMAL(3,2) DEFAULT 1.0,  -- Weight (0.0-1.0)
    
    -- Metadata
    metadata NVARCHAR(MAX),    -- JSON for custom attributes
    
    -- Lifecycle
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by INT NOT NULL,
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    deleted_at DATETIME2 NULL,
    
    CONSTRAINT fk_wsrel_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_wsrel_from FOREIGN KEY (from_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    CONSTRAINT fk_wsrel_to FOREIGN KEY (to_tag_id) REFERENCES tags(id),
    CONSTRAINT fk_wsrel_user FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Constraints depend on workspace type
    CONSTRAINT uq_workspace_relationship UNIQUE (workspace_id, from_tag_id, to_tag_id, relationship_type, deleted_at)
);

-- Indexes for fast queries
CREATE INDEX ix_wsrel_workspace ON workspace_tag_relationships(workspace_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX ix_wsrel_from ON workspace_tag_relationships(workspace_id, from_tag_id, relationship_type) WHERE deleted_at IS NULL;
CREATE INDEX ix_wsrel_to ON workspace_tag_relationships(workspace_id, to_tag_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_wsrel_path ON workspace_tag_relationships(workspace_id, from_path) WHERE deleted_at IS NULL;
CREATE INDEX ix_wsrel_type ON workspace_tag_relationships(workspace_id, relationship_type) WHERE deleted_at IS NULL;-- ============================================
-- WORKSPACE_TAG_PATHS: Optional closure table for workspaces
-- Only created when workspace.enable_closure_table = TRUE
-- ============================================
CREATE TABLE workspace_tag_paths (
    workspace_id INT NOT NULL,
    ancestor_id INT NOT NULL,
    descendant_id INT NOT NULL,
    depth INT NOT NULL,
    path_ids NVARCHAR(4000),  -- Full path of IDs: '1.5.10.15'
    
    PRIMARY KEY (workspace_id, ancestor_id, descendant_id),
    
    CONSTRAINT fk_wspath_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_wspath_ancestor FOREIGN KEY (ancestor_id) REFERENCES tags(id) ON DELETE CASCADE,
    CONSTRAINT fk_wspath_descendant FOREIGN KEY (descendant_id) REFERENCES tags(id)
);

CREATE INDEX ix_wspath_ancestor ON workspace_tag_paths(workspace_id, ancestor_id, depth);
CREATE INDEX ix_wspath_descendant ON workspace_tag_paths(workspace_id, descendant_id, depth);
CREATE INDEX ix_wspath_path ON workspace_tag_paths(workspace_id, path_ids);-- ============================================
-- WORKSPACE_RELATIONSHIP_TYPES: Define available relationship types per workspace
-- ============================================
CREATE TABLE workspace_relationship_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    workspace_id INT NOT NULL,
    type_name NVARCHAR(50) NOT NULL,
    
    -- Display metadata
    display_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    icon NVARCHAR(50),
    color NVARCHAR(7),
    line_style NVARCHAR(20) DEFAULT 'solid',
    
    -- Relationship properties
    is_bidirectional BIT DEFAULT 0,
    allows_cycles BIT DEFAULT 0,
    max_depth INT,
    
    -- Validation rules (JSON)
    validation_rules NVARCHAR(MAX),
    
    sort_order INT DEFAULT 0,
    
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT fk_wsreltype_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT uq_wsreltype UNIQUE (workspace_id, type_name)
);

CREATE INDEX ix_wsreltype_workspace ON workspace_relationship_types(workspace_id, sort_order);CREATE OR ALTER PROCEDURE usp_i_workspace
    @user_id INT,
    @name NVARCHAR(200),
    @type NVARCHAR(20) = 'hierarchy',
    @description NVARCHAR(1000) = NULL,
    @enable_closure_table BIT = 0,
    @max_depth INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate type
        IF @type NOT IN ('hierarchy', 'graph', 'network', 'timeline', 'custom')
        BEGIN
            RAISERROR('Invalid workspace type', 16, 1);
            RETURN;
        END;
        
        -- Create workspace
        INSERT INTO workspaces (
            user_id, name, type, description, 
            enable_closure_table, max_depth
        )
        VALUES (
            @user_id, @name, @type, @description,
            @enable_closure_table, @max_depth
        );
        
        DECLARE @workspace_id INT = SCOPE_IDENTITY();
        
        -- Initialize default relationship types based on workspace type
        IF @type = 'hierarchy'
        BEGIN
            INSERT INTO workspace_relationship_types (workspace_id, type_name, display_name, is_bidirectional, allows_cycles)
            VALUES (@workspace_id, 'parent_child', 'Parent-Child', 0, 0);
        END
        ELSE IF @type = 'graph'
        BEGIN
            INSERT INTO workspace_relationship_types (workspace_id, type_name, display_name, is_bidirectional, allows_cycles)
            VALUES 
                (@workspace_id, 'connected_to', 'Connected To', 1, 1),
                (@workspace_id, 'related_to', 'Related To', 1, 1);
        END
        ELSE IF @type = 'network'
        BEGIN
            INSERT INTO workspace_relationship_types (workspace_id, type_name, display_name, is_bidirectional, allows_cycles)
            VALUES 
                (@workspace_id, 'reports_to', 'Reports To', 0, 0),
                (@workspace_id, 'collaborates_with', 'Collaborates With', 1, 1),
                (@workspace_id, 'depends_on', 'Depends On', 0, 1);
        END;
        
        SELECT * FROM workspaces WHERE id = @workspace_id;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GOCREATE OR ALTER PROCEDURE usp_i_workspace_relationship
    @workspace_id INT,
    @from_tag_id INT,
    @to_tag_id INT,
    @user_id INT,
    @relationship_type NVARCHAR(50) = 'parent_child',
    @label NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate workspace
        DECLARE @workspace_type NVARCHAR(20);
        DECLARE @enable_closure BIT;
        DECLARE @max_depth INT;
        
        SELECT 
            @workspace_type = type,
            @enable_closure = enable_closure_table,
            @max_depth = max_depth
        FROM workspaces 
        WHERE id = @workspace_id 
        AND user_id = @user_id 
        AND deleted_at IS NULL;
        
        IF @workspace_type IS NULL
        BEGIN
            RAISERROR('Workspace not found', 16, 1);
            RETURN;
        END;
        
        -- Validate relationship type exists
        IF NOT EXISTS (
            SELECT 1 FROM workspace_relationship_types
            WHERE workspace_id = @workspace_id
            AND type_name = @relationship_type
        )
        BEGIN
            RAISERROR('Invalid relationship type for this workspace', 16, 1);
            RETURN;
        END;
        
        -- Get relationship type properties
        DECLARE @allows_cycles BIT;
        DECLARE @is_bidirectional BIT;
        
        SELECT 
            @allows_cycles = allows_cycles,
            @is_bidirectional = is_bidirectional
        FROM workspace_relationship_types
        WHERE workspace_id = @workspace_id
        AND type_name = @relationship_type;
        
        -- Check for cycles if not allowed
        IF @allows_cycles = 0
        BEGIN
            -- Check if adding this relationship creates a cycle
            IF EXISTS (
                SELECT 1 FROM workspace_tag_relationships
                WHERE workspace_id = @workspace_id
                AND from_tag_id = @to_tag_id
                AND to_path LIKE '%.' + CAST(@from_tag_id AS NVARCHAR) + '.%'
                AND deleted_at IS NULL
            )
            BEGIN
                RAISERROR('Relationship would create a cycle', 16, 1);
                RETURN;
            END;
        END;
        
        -- Calculate paths
        DECLARE @from_path NVARCHAR(4000);
        DECLARE @to_path NVARCHAR(4000);
        DECLARE @depth INT;
        
        -- Get parent path for from_tag
        SELECT TOP 1 @from_path = to_path
        FROM workspace_tag_relationships
        WHERE workspace_id = @workspace_id
        AND to_tag_id = @from_tag_id
        AND deleted_at IS NULL;
        
        -- If no parent, start new path
        IF @from_path IS NULL
            SET @from_path = CAST(@from_tag_id AS NVARCHAR);
        
        -- Build to_path
        SET @to_path = @from_path + '.' + CAST(@to_tag_id AS NVARCHAR);
        
        -- Calculate depth
        SET @depth = LEN(@to_path) - LEN(REPLACE(@to_path, '.', '')) + 1;
        
        -- Check max depth
        IF @depth > @max_depth
        BEGIN
            RAISERROR('Maximum depth exceeded', 16, 1);
            RETURN;
        END;
        
        -- Insert relationship
        INSERT INTO workspace_tag_relationships (
            workspace_id, from_tag_id, to_tag_id,
            relationship_type, from_path, to_path, depth,
            label, is_bidirectional, created_by
        )
        VALUES (
            @workspace_id, @from_tag_id, @to_tag_id,
            @relationship_type, @from_path, @to_path, @depth,
            @label, @is_bidirectional, @user_id
        );
        
        -- If bidirectional, create reverse relationship
        IF @is_bidirectional = 1
        BEGIN
            INSERT INTO workspace_tag_relationships (
                workspace_id, from_tag_id, to_tag_id,
                relationship_type, from_path, to_path, depth,
                label, is_bidirectional, created_by
            )
            VALUES (
                @workspace_id, @to_tag_id, @from_tag_id,
                @relationship_type, @from_path, @to_path, @depth,
                @label, @is_bidirectional, @user_id
            );
        END;
        
        -- Update closure table if enabled
        IF @enable_closure = 1
        BEGIN
            EXEC usp_update_workspace_closure @workspace_id, @to_tag_id;
        END;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GOCREATE OR ALTER PROCEDURE usp_s_workspace_tree
    @workspace_id INT,
    @user_id INT,
    @root_tag_id INT = NULL,
    @relationship_type NVARCHAR(50) = NULL,
    @max_depth INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate access
    DECLARE @enable_closure BIT;
    DECLARE @workspace_type NVARCHAR(20);
    
    SELECT 
        @enable_closure = enable_closure_table,
        @workspace_type = type
    FROM workspaces 
    WHERE id = @workspace_id 
    AND user_id = @user_id 
    AND deleted_at IS NULL;
    
    IF @workspace_type IS NULL
    BEGIN
        RAISERROR('Workspace not found', 16, 1);
        RETURN;
    END;
    
    -- Query strategy based on closure table setting
    IF @enable_closure = 1 AND EXISTS (SELECT 1 FROM workspace_tag_paths WHERE workspace_id = @workspace_id)
    BEGIN
        -- Use closure table (fast)
        SELECT 
            wtp.ancestor_id,
            wtp.descendant_id,
            wtp.depth,
            wtp.path_ids,
            t.name AS tag_name,
            t.color AS tag_color,
            wtr.relationship_type,
            wtr.label
        FROM workspace_tag_paths wtp
        JOIN tags t ON t.id = wtp.descendant_id
        LEFT JOIN workspace_tag_relationships wtr ON wtr.workspace_id = wtp.workspace_id
            AND wtr.to_tag_id = wtp.descendant_id
            AND wtr.deleted_at IS NULL
        WHERE wtp.workspace_id = @workspace_id
        AND (@root_tag_id IS NULL OR wtp.ancestor_id = @root_tag_id)
        AND (@max_depth IS NULL OR wtp.depth <= @max_depth)
        AND (@relationship_type IS NULL OR wtr.relationship_type = @relationship_type)
        ORDER BY wtp.depth, wtp.path_ids;
    END
    ELSE
    BEGIN
        -- Use recursive CTE (flexible)
        ;WITH WorkspaceTree AS (
            -- Roots
            SELECT 
                wtr.from_tag_id AS parent_id,
                wtr.to_tag_id AS tag_id,
                t.name AS tag_name,
                t.color AS tag_color,
                wtr.relationship_type,
                wtr.label,
                wtr.depth,
                wtr.to_path AS path,
                0 AS level
            FROM workspace_tag_relationships wtr
            JOIN tags t ON t.id = wtr.to_tag_id
            WHERE wtr.workspace_id = @workspace_id
            AND wtr.deleted_at IS NULL
            AND (@root_tag_id IS NULL AND wtr.from_path = CAST(wtr.from_tag_id AS NVARCHAR)
                OR @root_tag_id IS NOT NULL AND wtr.from_tag_id = @root_tag_id)
            AND (@relationship_type IS NULL OR wtr.relationship_type = @relationship_type)
            
            UNION ALL
            
            -- Descendants
            SELECT 
                wtr.from_tag_id,
                wtr.to_tag_id,
                t.name,
                t.color,
                wtr.relationship_type,
                wtr.label,
                wtr.depth,
                wtr.to_path,
                wt.level + 1
            FROM WorkspaceTree wt
            JOIN workspace_tag_relationships wtr ON wtr.workspace_id = @workspace_id
                AND wtr.from_tag_id = wt.tag_id
                AND wtr.deleted_at IS NULL
            JOIN tags t ON t.id = wtr.to_tag_id
            WHERE (@max_depth IS NULL OR wt.level < @max_depth)
            AND (@relationship_type IS NULL OR wtr.relationship_type = @relationship_type)
        )
        
        SELECT * FROM WorkspaceTree
        ORDER BY path, level;
    END;
END;
GO-- Large, stable hierarchies
-- Example: Organization chart (1000+ employees, rarely changes)
UPDATE workspaces 
SET enable_closure_table = 1
WHERE type = 'hierarchy'
AND (
    SELECT COUNT(*) 
    FROM workspace_tag_relationships 
    WHERE workspace_id = workspaces.id
) > 1000;

-- Deep trees with frequent deep queries
-- Example: File system (depth > 10)
UPDATE workspaces
SET enable_closure_table = 1
WHERE max_depth > 10;-- Clone workspace structure
CREATE OR ALTER PROCEDURE usp_clone_workspace
    @source_workspace_id INT,
    @user_id INT,
    @new_name NVARCHAR(200)
AS
BEGIN
    -- Create new workspace with same settings
    -- Copy relationships with new workspace_id
    -- Maintain all metadata
END;
GO-- Merge multiple workspaces
CREATE OR ALTER PROCEDURE usp_merge_workspaces
    @target_workspace_id INT,
    @source_workspace_ids NVARCHAR(MAX), -- Comma-separated IDs
    @user_id INT,
    @conflict_resolution NVARCHAR(20) = 'keep_both'
AS
BEGIN
    -- Handle duplicate relationships
    -- Resolve path conflicts
    -- Update closure table
END;
GO