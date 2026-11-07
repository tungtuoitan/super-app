/**
 * Workspace request types - API requests/responses for workspace item operations
 * Aligns with backend AddItemToWorkspaceRequest and WorkspaceItem
 */

import { workspaceConstants } from "@/features/workspace/workspace.constants";
import type { WorkspaceItem } from "./workspaceItem.types";

/**
 * Type aliases for backend API compatibility
 */
export type ChildType = typeof workspaceConstants.itemTypes.note | typeof workspaceConstants.itemTypes.folder;

/**
 * Request to add an item (folder or note) to a workspace
 * Maps to backend AddItemToWorkspaceRequest
 */
export interface AddItemToWorkspaceRequest {
    /** Parent folder ID where the item will be placed (null for root items) */
    parentTagId?: number | null; // Backend field name (kept for API compatibility)
    parentFolderId?: number | null; // Frontend alias

    /** Type of child entity - 'folder' for workspace folders, 'note' for notes */
    childType: ChildType; // Backend accepts 'folder', frontend uses 'folder'

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
 * Response from workspace item operations (add/update/delete)
 * Maps to backend WorkspaceItemOperationResponse
 */
export interface WorkspaceItemOperationResponse {
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
export type UpdateWorkspaceItemResponse = WorkspaceItem & {
    message?: string;
};

/**
 * Single item identifier to be moved in workspace
 * Maps to backend ItemIdentifier
 */
export interface MoveItemIdentifier {
    /** Item type: 2 = folder, 3 = note, 4 = file */
    type: 2 | 3 | 4;

    /** Item ID (folder/note/file entity ID) */
    id: number;
}

/**
 * Request to move multiple workspace items
 * Maps to backend MoveItemsRequest
 */
export interface MoveItemsRequest {
    /** Array of items to move */
    items: MoveItemIdentifier[];

    /** Target parent folder ID (null = move to root level) */
    targetParentId?: number | null;

    /** Target workspace ID (null = same workspace) */
    targetWorkspaceId?: number | null;
}

/**
 * Single item to be deleted from workspace
 * Maps to backend DeleteItemRequest
 */
export interface DeleteItemRequest {
    /** Item ID to delete */
    id: number;

    /** Item type: 2 = folder, 3 = note, 4 = file */
    type: 2 | 3 | 4;
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

    /** Hard delete flag: true = permanently delete, false = soft delete (default) */
    isHardDelete?: boolean;
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
 * Workspace item action enum
 * Eliminates ambiguity in API requests (e.g., move to root with parentId=null vs restore)
 * Follows Microsoft Graph API pattern for batch operations
 */
export enum WorkspaceItemAction {
    /** CREATE new entity + workspace_item */
    Create = "CREATE",
    /** ADD existing entity to workspace */
    Add = "ADD",
    /** MOVE workspace_item to new location (within same workspace) */
    Move = "MOVE",
    /** UPDATE FOLDER data (FOLDER ONLY - name, description, color, icon, etc.) */
    UpdateFolder = "UPDATEFOLDER", // Note: Only for folders. Notes/Files use their own entity-specific APIs.
    /** SOFT DELETE workspace_item */
    Delete = "DELETE",
    /** RESTORE deleted workspace_item */
    Restore = "RESTORE",
}

/**
 * Action-based request for workspace item batch operations
 * Eliminates ambiguity by using explicit Action enum (follows Microsoft Graph API pattern)
 * Pattern: 100% follows backend UpsertWorkspaceItemRequest
 *
 * VALIDATION RULES PER ACTION:
 *
 * 1. CREATE (new entity + workspace_item):
 *    Required: action=Create, entityType, entityData
 *    Optional: parentId (null = root), workspaceId
 *    Example: { action: "CREATE", entityType: 2, parentId: null, folderData: {...} }
 *
 * 2. ADD (existing entity to workspace):
 *    Required: action=Add, entityType, entityId
 *    Optional: parentId (null = root), workspaceId
 *    Example: { action: "ADD", entityType: 3, entityId: 456, parentId: 123 }
 *
 * 3. MOVE (change location within same workspace):
 *    Required: action=Move, id, parentId
 *    Optional: None
 *    ParentId = workspace_items.id of new parent (NOT entity ID!)
 *    Example: { action: "MOVE", id: 789, parentId: null } ← move to root
 *
 * 4. UPDATE_FOLDER (update folder properties - FOLDER ONLY):
 *    Required: action=UpdateFolder, id, folderData
 *    Optional: None
 *    Note: Only for folders. Notes/Files use their own entity-specific APIs.
 *    Example: { action: "UPDATEFOLDER", id: 789, folderData: { name: "New Name", color: "#FF5733" } }
 *
 * 6. DELETE (soft delete):
 *    Required: action=Delete, id
 *    Optional: None
 *    Example: { action: "DELETE", id: 789 }
 *
 * 7. RESTORE (un-delete):
 *    Required: action=Restore, id
 *    Optional: None
 *    Example: { action: "RESTORE", id: 789 }
 */
export interface UpsertWorkspaceItemRequest {
    /** Explicit action to perform on workspace item */
    action: WorkspaceItemAction;

    /** Workspace item ID - Required for: Move, UpdateFolder, Delete, Restore */
    id?: number | null;

    /** Workspace ID — set by controller from route, override for Add/Create */
    workspaceId?: number | null;

    /** User ID (set by controller from JWT) */
    userId?: number;

    /** Parent workspace_item ID (SELF-REFERENCING) - Required for: Move, Optional for: Create, Add */
    parentId?: number | null;

    /** Entity type: 2=folder, 3=note, 4=file - Required for: Create, Add */
    entityType?: 2 | 3 | 4;

    /** Entity ID (references existing folder/note/file from entity tables) - Required for: Add */
    entityId?: number;


    /** User email (set by controller) */
    createdBy?: string;

    /** Folder entity data - Required for: Create (entityType=2), Update (entityType=2) */
    folderData?: UpsertFolderData;

    /** Note entity data - Required for: Create (entityType=3), Update (entityType=3) */
    noteData?: UpsertNoteData;

    /** File entity data - Required for: Create (entityType=4), Update (entityType=4) */
    fileData?: UpsertFileData;
}

/** Folder entity data for batch upsert */
export interface UpsertFolderData {
    id?: number;
    userId?: number;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    deletedAt?: string | null;
}

/** Note entity data for batch upsert */
export interface UpsertNoteData {
    id?: number;
    userId?: number;
    name: string;
    description?: string | null;
    statusCode?: string | null;
    icon?: string | null;
    color?: string | null;
    tagIds?: number[];
    deletedAt?: string | null;
}

/** File entity data for batch upsert */
export interface UpsertFileData {
    id?: number;
    userId?: number;
    name: string;
    url?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    extension?: string | null;
    statusCode?: string | null;
    deletedAt?: string | null;
}
