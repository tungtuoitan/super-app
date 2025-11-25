/**
 * Tag Types and Interfaces
 * Domain models and DTOs for the tag feature
 */

// API Response DTO (from backend TagResponse)
// Backend returns: TagId, Name, Description, Color, CreatedAt, IsActive, Depth
export interface TagDTO {
    tagId: number;
    name: string;
    description?: string;
    color?: string;
    createdAt: string; // ISO string from API
    isActive: boolean;
    depth?: number; // Depth in hierarchy (0 = root, 1 = child, etc.)
    // Note: Backend does NOT return userId, updatedAt, or deletedAt for security
}

// API Response DTO for Tag Tree (from backend TagTreeResponse)
export interface TagTreeResponseDTO {
    tagId: number;
    userId: number;
    name: string;
    parentId?: number;
    path?: string;
    slug?: string;
    color?: string;
    icon?: string;
    accessType: string; // 'owner' or 'shared'
    level: number;
    usageCount: number;
    childrenCount: number;
    children: TagTreeResponseDTO[];
    isExpanded: boolean;
    isSelected: boolean;
}

// Domain model (what we use in app)
export interface Tag {
    tagId: number; // Primary key from backend
    name: string;
    description?: string;
    color?: string;
    createdAt: Date;
    isActive: boolean;
    depth?: number; // Depth in hierarchy from backend (0 = root, 1 = child, etc.)

    // Frontend-only properties for tree UI and backward compatibility
    id?: number; // Alias for tagId for some components
    itemId?: number; // WorkspaceItems.item_id (when loaded from workspace tree)
    children?: Tag[]; // Child tags for tree structure (built from depth)
    isExpanded?: boolean; // For tree UI state
    isArchived?: boolean; // Computed from isActive (!isActive)
    noteCount?: number; // Number of notes associated with this tag

    // Note: userId, updatedAt, deletedAt are NOT returned by backend (removed for security)
    // These fields should not be accessed in new code
}

// Create request (matches backend CreateTagRequest)
export interface CreateTagDTO {
    name: string;
    description?: string;
    color?: string;
    parentId?: number;
    slug?: string;
    icon?: string;
    isPublic?: boolean;
    publicSlug?: string;
    userId?: number; // Optional in frontend, defaults to 14 in service for development
}

// Update request
export interface UpdateTagDTO {
    name?: string;
    description?: string;
    color?: string;
    parentId?: number;
    isArchived?: boolean;
}

// Move tag request
export interface MoveTagDTO {
    tagId: number;
    newParentId?: number; // null or undefined for root level
    newIndex?: number; // Position in the new parent's children array
}

// Query parameters
export interface GetTagsParams {
    page?: number;
    pageSize?: number;
    search?: string;
    parentId?: number; // For fetching children of specific tag
    isArchived?: boolean;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}

// Layout types for TagPage
export type TagLayoutType = 'grid' | 'tree' | 'card';

// Tree node for TagTree component
export interface TagTreeNode extends Tag {
    hasChildren: boolean;
    isLoading?: boolean;
}

// Workspace Tree Item Response (from backend WorkspaceTreeItemResponse)
// Polymorphic - can be Tag, Note, or File
export interface WorkspaceTreeItemDTO {
    id: number; // workspace_items.item_id (for deletion)
    itemId: number; // workspace_items.item_id (alias for id)
    childId: number; // Actual tag_id/note_id/file_id
    itemType: 'Tag' | 'Note' | 'File';
    name: string;
    parentId?: number; // parent_tag_id (null for root items)
    label?: string;
    notes?: string;
    color?: string;
    icon?: string;
    sortOrder?: number;
    relationshipType?: string;
    children: WorkspaceTreeItemDTO[]; // Hierarchical children
}

// Workspace with Tree Response (from backend WorkspaceWithTreeResponse)
// NEW: Replaces WorkspaceWithTagTreeResponse
export interface WorkspaceWithTreeDTO {
    workspaceId: number;
    userId: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: string;
    maxDepth?: number;
    isDefault: boolean;
    isPublic: boolean;
    isTemplate: boolean;
    isArchived: boolean;
    tagCount: number;
    noteCount: number;
    fileCount: number;
    memberCount: number;
    settings?: string;
    createdAt: string;
    updatedAt?: string;
    items: WorkspaceTreeItemDTO[]; // Polymorphic tree items (tags, notes, files)
}

// DEPRECATED: Old workspace with tag tree (keeping for backward compatibility)
export interface WorkspaceWithTagTreeDTO {
    workspaceId: number;
    userId: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: string;
    maxDepth?: number;
    isDefault: boolean;
    isPublic: boolean;
    isTemplate: boolean;
    isArchived: boolean;
    tagCount: number;
    memberCount: number;
    settings?: string;
    createdAt: string;
    updatedAt?: string;
    tags: TagTreeResponseDTO[]; // Hierarchical tag tree
}

// Workspace domain model for frontend
export interface WorkspaceWithTagTree {
    workspaceId: number;
    userId: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: string;
    maxDepth?: number;
    isDefault: boolean;
    isPublic: boolean;
    isTemplate: boolean;
    isArchived: boolean;
    tagCount: number;
    memberCount: number;
    settings?: string;
    createdAt: Date;
    updatedAt?: Date;
    tags: Tag[]; // Transformed tags
}

// Tag with hierarchy path (for breadcrumbs, etc.)
export interface TagWithPath extends Tag {
    hierarchyPath: Tag[]; // Array from root to current tag (renamed to avoid conflict)
}