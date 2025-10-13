/**
 * Tag Types and Interfaces
 * Domain models and DTOs for the tag feature
 */

// API Response DTO (from backend TagResponse)
export interface TagDTO {
    tagId: number;
    name: string;
    description?: string;
    color?: string;
    createdAt: string; // ISO string from API
    isActive: boolean;
    depth?: number; // Depth in hierarchy (0 = root, 1 = child, etc.)
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
    children?: Tag[]; // Child tags for tree structure (built from depth)
    isExpanded?: boolean; // For tree UI state
    isArchived?: boolean; // Computed from isActive (!isActive)
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