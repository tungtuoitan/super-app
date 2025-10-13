/**
 * Tag Types and Interfaces
 * Domain models and DTOs for the tag feature
 */

// Domain model (what we use in app)
export interface Tag {
    id: number; // Changed from tagId to match backend
    userId: number;
    name: string;
    parentId?: number;
    path?: string;
    slug?: string;
    color?: string;
    icon?: string;
    description?: string;
    isPublic?: boolean;
    publicSlug?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    createdBy?: number;
    // Computed properties for backward compatibility and UI
    tagId: number; // Alias for id for backward compatibility
    isArchived: boolean; // Computed from deletedAt
    // Frontend-only properties for tree UI
    level?: number; // Depth in tree (0 = root, 1 = child, etc.)
    children?: Tag[]; // Child tags for tree structure
    isExpanded?: boolean; // For tree UI state
}

// Create request
export interface CreateTagDTO {
    name: string;
    description?: string;
    color?: string;
    parentId?: number;
}

// Update request
export interface UpdateTagDTO {
    name?: string;
    description?: string;
    color?: string;
    parentId?: number;
    isArchived?: boolean;
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

// Tag with hierarchy path (for breadcrumbs, etc.)
export interface TagWithPath extends Tag {
    hierarchyPath: Tag[]; // Array from root to current tag (renamed to avoid conflict)
}