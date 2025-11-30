/**
 * Workspace Types - Types for workspace folder tree operations
 * Aligns with backend AddItemToWorkspaceRequest and WorkspaceItemResponse
 * Note: Backend still uses "tag" terminology in API
 */

/**
 * Request to add an item (folder or note) to a workspace
 * Maps to backend AddItemToWorkspaceRequest
 */
export interface AddItemToWorkspaceRequest {
    /** Parent folder ID where the item will be placed (null for root items) */
    parentTagId?: number | null; // Backend field name (kept for API compatibility)
    parentFolderId?: number | null; // Frontend alias
    
    /** Type of child entity - 'folder' for workspace folders, 'note' for notes */
    childType: 'tag' | 'note' | 'folder'; // Backend accepts 'tag', frontend uses 'folder'
    
    /** ID of the child entity (optional if creating new folder) */
    childId?: number;
    
    /** Folder name (required when childType='folder' and childId is not provided - will auto-create folder) */
    tagName?: string; // Backend field name (kept for API compatibility)
    folderName?: string; // Frontend alias
    
    /** Optional relationship type (e.g., 'contains', 'references') */
    relationshipType?: string;
    
    /** Custom label for this relationship */
    label?: string;
    
    /** Additional notes about this relationship */
    notes?: string;
    
    /** Sort order for display (default: 0) */
    sortOrder?: number;
    
    /** Optional color for visual distinction (hex format #RRGGBB) */
    color?: string;
    
    /** Optional icon identifier */
    icon?: string;
}

/**
 * Response from workspace item operations
 * Maps to backend WorkspaceItemResponse
 */
export interface WorkspaceItemResponse {
    itemId: number;
    workspaceId: number;
    parentTagId: number | null;
    childType: string;
    childId: number;
    relationshipType?: string;
    label?: string;
    notes?: string;
    itemPath?: string;
    depth: number;
    sortOrder: number;
    color?: string;
    icon?: string;
    addedBy: number;
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
    
    // Navigation properties
    parentTagName?: string;
    childName?: string;
    addedByUserName?: string;
}

/**
 * Request to update workspace item metadata
 * Maps to backend UpdateWorkspaceItemRequest
 */
export interface UpdateWorkspaceItemRequest {
    /** Custom label for this item */
    label?: string;
    
    /** Additional notes about this item */
    notes?: string;
    
    /** Color for visual distinction (hex format #RRGGBB) */
    color?: string;
    
    /** Icon identifier */
    icon?: string;
    
    /** Sort order for display */
    sortOrder?: number;
}

/**
 * Response from update workspace item operation
 * Maps to backend UpdateWorkspaceItemResponse
 */
export interface UpdateWorkspaceItemResponse extends WorkspaceItemResponse {
    message?: string;
}

/**
 * Single item to be moved in workspace
 * Maps to backend MoveItemRequest
 */
export interface MoveItemRequest {
    /** Workspace item ID to move */
    itemId: number;
    
    /** New parent folder ID (null for root level) */
    newParentTagId?: number | null;
    newParentFolderId?: number | null; // Frontend alias
    
    /** New sort order (optional) */
    sortOrder?: number;
}

/**
 * Request to move multiple workspace items
 * Maps to backend MoveItemsRequest
 */
export interface MoveItemsRequest {
    /** Array of items to move */
    items: MoveItemRequest[];
    
    /** Whether to cascade move child items (default: true) */
    cascade?: boolean;
}

/**
 * Single item to be deleted from workspace
 * Maps to backend DeleteItemRequest
 */
export interface DeleteItemRequest {
    /** Workspace item ID to delete */
    itemId: number;
}

/**
 * Request to delete multiple workspace items
 * Maps to backend DeleteItemsRequest
 */
export interface DeleteItemsRequest {
    /** Array of item IDs to delete */
    items: DeleteItemRequest[];
    
    /** Whether to cascade delete child items (default: true) */
    cascade?: boolean;
}

/**
 * Generic result response from workspace operations
 * Maps to backend ResultOptions
 */
export interface WorkspaceOperationResult {
    success: boolean;
    message?: string;
    status?: number;
    object?: any;
}

/**
 * Workspace tree item response - represents a single item in the tree hierarchy
 * Maps to backend WorkspaceTreeItemResponse
 */
export interface WorkspaceTreeItemResponse {
    /** Type of the item: 'tag', 'note', or 'file' */
    itemType: string;

    /** Workspace item ID - used for deletion */
    itemId: number;

    /** Workspace item ID (alias for itemId) */
    id: number;

    /** Child entity ID (TagId/NoteId/FileId) */
    childId: number;

    /** User ID who owns/created this item */
    userId: number;

    /** Display name of the item */
    name: string;

    /** Parent tag ID (null for root-level items) */
    parentId?: number | null;

    /** URL-friendly slug */
    slug?: string;

    /** Hex color code for display */
    color?: string;

    /** Icon name or class */
    icon?: string;

    /** Access type: 'owner' or 'shared' */
    accessType: string;

    /** Whether this workspace owns the item */
    isOriginal: boolean;

    /** Depth level in tree hierarchy (0 = root) */
    level: number;

    /** Position/order within same parent */
    position: number;

    /** Sort order (alias for position) */
    sortOrder: number;

    /** Depth in tree (alias for level) */
    depth: number;

    /** Type-specific metadata */
    metadata?: any;

    /** Child items in the tree */
    children: WorkspaceTreeItemResponse[];

    /** UI state: Whether expanded */
    isExpanded: boolean;

    /** UI state: Whether selected */
    isSelected: boolean;

    /** When created */
    createdAt: string;

    /** When last updated */
    updatedAt?: string;
}

/**
 * Workspace list item response - for workspace selection dropdown
 * Maps to backend WorkspaceListResponse
 */
export interface WorkspaceListResponse {
    /** Workspace ID */
    id: number;

    /** User ID who owns the workspace */
    userId: number;

    /** Workspace name */
    name: string;

    /** Workspace description */
    description?: string;

    /** When created */
    createdAt: string;

    /** When last updated */
    updatedAt?: string;
}

/**
 * Workspace with complete tree hierarchy response
 * Maps to backend WorkspaceWithTreeResponse
 */
export interface WorkspaceWithTreeResponse {
    /** Workspace ID */
    workspaceId: number;

    /** User ID who owns the workspace */
    userId: number;

    /** Workspace name */
    name: string;

    /** Workspace description */
    description?: string;

    /** Hex color code */
    color?: string;

    /** Icon name or class */
    icon?: string;

    /** Workspace organization type */
    type?: string;

    /** Maximum depth allowed */
    maxDepth?: number;

    /** Whether this is the default workspace */
    isDefault: boolean;

    /** Whether publicly accessible */
    isPublic: boolean;

    /** Whether this is a template */
    isTemplate: boolean;

    /** Whether archived */
    isArchived: boolean;

    /** Total number of tags */
    tagCount: number;

    /** Total number of notes */
    noteCount: number;

    /** Total number of files */
    fileCount: number;

    /** Number of members */
    memberCount: number;

    /** Additional settings as JSON */
    settings?: string;

    /** When created */
    createdAt: string;

    /** When last updated */
    updatedAt?: string;

    /** Hierarchical tree structure */
    items: WorkspaceTreeItemResponse[];
}
