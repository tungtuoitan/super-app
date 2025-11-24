/**
 * Workspace Types - Types for workspace tag tree operations
 * Aligns with backend AddItemToWorkspaceRequest and WorkspaceItemResponse
 */

/**
 * Request to add an item (tag or note) to a workspace
 * Maps to backend AddItemToWorkspaceRequest
 */
export interface AddItemToWorkspaceRequest {
    /** Parent tag ID where the item will be placed (null for root items) */
    parentTagId?: number | null;
    
    /** Type of child entity (e.g., 'tag', 'note') */
    childType: 'tag' | 'note';
    
    /** ID of the child entity (optional if creating new tag) */
    childId?: number;
    
    /** Tag name (required when childType='tag' and childId is not provided - will auto-create tag) */
    tagName?: string;
    
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
