/**
 * @deprecated Legacy folder types — not used in KTree V2.
 * KTree V2 uses KNodeData (K-v2.types.ts) instead.
 * Will be removed in Phase 3.
 */

import type { FolderEntity } from "@/types/workspace-v2.types";

// API Response DTO (from backend FolderResponse)
// Backend returns: Id, Name, Description, Color, CreatedAt, IsActive, Depth
export interface FolderDTO {
    name: string;
    description?: string;
    color?: string;
    createdAt: string; // ISO string from API
    isActive: boolean;
    depth?: number; // Depth in hierarchy (0 = root, 1 = child, etc.)
}

// API Response DTO for Folder Tree (from backend FolderTreeResponse if exists, or WorkspaceItemResponse)
export interface FolderTreeResponseDTO {
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
    children: FolderTreeResponseDTO[];
    isExpanded: boolean;
    isSelected: boolean;
}

/**
 * Folder domain model (extends FolderEntity with UI state & business logic)
 * Use this for in-app state management and UI components
 */
export interface Folder extends Omit<FolderEntity, 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
    // Override userId to optional (not always available when transforming from WorkspaceItem)
    userId?: number;

    // Override date types from ISO string to Date for domain model
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;

    // Business logic fields (not in entity)
    isActive: boolean;
    depth?: number; // Depth in hierarchy from backend (0 = root, 1 = child, etc.)
    parentId?: number | null; // Parent folder ID (null for root level)

    // UI state fields (frontend-only)
    children?: Folder[]; // Child folders for tree structure
    isExpanded?: boolean; // For tree UI state
    isArchived?: boolean; // Computed from isActive (!isActive)
    noteCount?: number; // Number of notes in this folder
}

// Create request (matches backend CreateFolderRequest)
export interface CreateFolderDTO {
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
export interface UpdateFolderDTO {
    name?: string;
    description?: string;
    color?: string;
    parentId?: number;
    isArchived?: boolean;
}

// Move folder request
export interface MoveFolderDTO {
    id: number;
    newParentId?: number; // null or undefined for root level
    newIndex?: number; // Position in the new parent's children array
}

// Query parameters
export interface GetFoldersParams {
    page?: number;
    pageSize?: number;
    search?: string;
    parentId?: number; // For fetching children of specific folder
    isArchived?: boolean;
    sortBy?: "name" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
}

// Layout types for FolderPage
export type FolderLayoutType = "grid" | "tree" | "card";

// Tree node for FolderTree component
export interface FolderTreeNode extends Folder {
    hasChildren: boolean;
    isLoading?: boolean;
}

// Workspace Tree Item Response (from backend WorkspaceTreeItemResponse)
// Polymorphic - can be Folder, Note, or File
export interface WorkspaceTreeItemDTO {
    id: number; // workspace_items.item_id === id of table folder/note/file
    childId: number; // Actual tag_id/note_id/file_id
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
    folderCount: number; // Backend field name (renamed from tagCount)
    noteCount: number;
    fileCount: number;
    memberCount: number;
    settings?: string;
    createdAt: string;
    updatedAt?: string;
    items: WorkspaceTreeItemDTO[]; // Polymorphic tree items (folders, notes, files)
}

// Workspace domain model for frontend
export interface WorkspaceWithFolderTree {
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
    folderCount: number; // Maps to backend folderCount
    memberCount: number;
    settings?: string;
    createdAt: Date;
    updatedAt?: Date;
    folders: Folder[]; // Transformed folders

}

// Folder with hierarchy path (for breadcrumbs, etc.)
export interface FolderWithPath extends Folder {
    hierarchyPath: Folder[]; // Array from root to current folder
}

// Helper type: Transform backend DTO to frontend Folder
export type FolderTransform = (dto: FolderDTO) => Folder;
