/**
 * Workspace Types - Types for workspace folder tree operations
 * Aligns with backend AddItemToWorkspaceRequest and WorkspaceItem
 */

import {kconstants} from "../utils/K.Constants";


/**
 * Type aliases for backend API compatibility
 */
export type ChildType = typeof kconstants.workspace.itemTypes.note | typeof kconstants.workspace.itemTypes.folder;

/**
 * Request to add an item (folder or note) to a workspace
 * Maps to backend AddItemToWorkspaceRequest
 */ 
export interface KAddItemToWorkspaceRequest {
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
export interface KWorkspaceItemOperationResponse {
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
export interface KUpdateWorkspaceItemRequest {
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
export type KUpdateWorkspaceItemResponse = KWorkspaceItem & {
    message?: string;
};

/**
 * Single item identifier to be moved in workspace
 * Maps to backend ItemIdentifier
 */
export interface KMoveItemIdentifier {
    /** Item type: 2 = folder, 3 = note, 4 = file */
    type: 2 | 3 | 4;

    /** Item ID (folder/note/file entity ID) */
    id: number;
}

/**
 * Request to move multiple workspace items
 * Maps to backend MoveItemsRequest
 */
export interface KMoveItemsRequest {
    /** Array of items to move */
    items: KMoveItemIdentifier[];

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
export interface KDeleteItemsRequest {
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
export interface KWorkspaceOperationResult {
    success: boolean;
    message?: string;
    status?: number;
    object?: any;
}

// ============================================
// METADATA TYPES
// ============================================

/** Folder-specific metadata */
export interface KFolderMetadata {
    /** Hierarchical path (e.g., "/1/5/12/") */
    path?: string;

    /** Usage count across workspace */
    usageCount: number;

    /** Total direct children */
    childrenCount: number;
    tagChildrenCount: number;
    noteChildrenCount: number;
    fileChildrenCount: number;

    /** Optional description */
    description?: string;

    /** Public sharing */
    isPublic: boolean;
    publicSlug?: string;

    /** Visual */
    color?: string;
    icon?: string;

    /** Timestamps */
    createdAt?: string;
}

/** Note-specific metadata */
export interface KNoteMetadata {
    /** Description/summary */
    description?: string;

    /** Content preview (first 200 chars) */
    contentPreview?: string;

    /** Content type */
    contentType?: "markdown" | "plain" | "rich-text";

    /** States */
    isArchived: boolean;
    isPinned: boolean;
    isFavorite: boolean;

    /** Counts */
    versionCount: number;
    memberCount: number;

    /** Public sharing */
    isPublic: boolean;
    publicSlug?: string;

    /** Timestamps */
    createdAt?: string;
    updatedAt?: string;
}

/** File-specific metadata */
export interface KFileMetadata {
    /** File info */
    originalFilename: string;
    extension: string;
    mimeType: string;

    /** Size */
    fileSize: number;
    fileSizeFormatted: string;

    /** Storage */
    filePath: string;
    storagePath: string;
    blobUrl?: string;
    blobContainerName?: string;

    /** Optional description */
    description?: string;

    /** States */
    isPublic: boolean;
    isArchived: boolean;

    /** Download stats */
    downloadCount: number;
    lastDownloadedAt?: string;

    /** Preview */
    thumbnailUrl?: string;

    /** Timestamps */
    createdAt?: string;
    updatedAt?: string;
}

// ============================================
// BASE ITEM (Shared properties)
// ============================================

/**
 * Base workspace item - all items share these properties
 */
interface KBaseWorkspaceItem {
    /** User ID owner */
    userId: number;

    /** Display name */
    name: string;

    /** Parent folder ID (null = workspace root) */
    parentId?: number | null;

    /** URL slug */
    slug?: string;

    /** Visual */
    color?: string;
    icon?: string;

    /** Access info */
    accessType: "owner" | "shared";
    isOriginal: boolean;

    /** Hierarchy info */
    level: number;
    depth: number;
    position: number;
    sortOrder: number;

    /** UI states */
    isExpanded: boolean;
    isSelected: boolean;

    /** Timestamps */
    createdAt: string;
    updatedAt?: string;

    deletedAt?: string;
}

// ============================================
// SPECIFIC ITEM TYPES
// ============================================

/**
 * Folder item - can have children
 * ✅ id = folder ID (TagId in database)
 * ✅ type = 'folder'
 */
export interface FolderItem extends KBaseWorkspaceItem {
    /** ID of folder */
    id: number;

    /** Type of item */
    type: typeof kconstants.workspace.itemTypes.folder;

    /** Folder-specific metadata */
    metadata?: KFolderMetadata;

    /** Child items (folders, notes, files) */
    children: KWorkspaceItem[];
}

/**
 * Note item - always leaf node
 * ✅ id = note ID (NoteId in database)
 * ✅ type = 'note'
 */
export interface NoteItem extends KBaseWorkspaceItem {
    /** ID of note */
    id: number;

    /** Type of item */
    type: typeof kconstants.workspace.itemTypes.note;

    /** Note-specific metadata */
    metadata?: KNoteMetadata;

    /** Notes cannot have children */
    children?: never[];
}

/**
 * File item - always leaf node
 * ✅ id = file ID (FileId in database)
 * ✅ type = 'file'
 */
export interface FileItem extends KBaseWorkspaceItem {
    /** ID of file */
    id: number;

    /** Type of item */
    type: typeof kconstants.workspace.itemTypes.file;

    /** File-specific metadata */
    metadata?: KFileMetadata;

    /** Files cannot have children */
    children?: never[];
}

/**
 * Discriminated union of all workspace item types
 * Use this for type-safe item handling
 */
export type KWorkspaceItem = FolderItem | NoteItem | FileItem;

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if item is a folder
 */
export function isFolder(item: KWorkspaceItem): item is FolderItem {
    return item.type === kconstants.workspace.itemTypes.folder;
}

/**
 * Type guard to check if item is a note
 */
export function isNote(item: KWorkspaceItem): item is NoteItem {
    return item.type === kconstants.workspace.itemTypes.note;
}

/**
 * Type guard to check if item is a file
 */
export function isFile(item: KWorkspaceItem): item is FileItem {
    return item.type === kconstants.workspace.itemTypes.file;
}

/**
 * Type guard to check if item is a leaf node (note or file)
 */
export function isLeafNode(item: KWorkspaceItem): item is NoteItem | FileItem {
    return item.type === kconstants.workspace.itemTypes.note || item.type === kconstants.workspace.itemTypes.file;
}

/**
 * Type guard to check if item can have children (folder)
 */
export function canHaveChildren(item: KWorkspaceItem): item is FolderItem {
    return item.type === kconstants.workspace.itemTypes.folder;
}

/**
 * Workspace (Ws) interface - domain model with Date objects
 * Used in workspace grid and editor
 */
export interface KWs {
    id: number;
    name: string;
    description?: string | null;
    statusCode?: string; // Workspace status code
    hashtags?: string; // Hashtags string
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt: Date | null;
    isHardDeleted?: boolean;
    userId?: number;
    createdBy?: string; // User who created the workspace
}

/**
 * Ws item response - for ws selection dropdown
 * Maps to backend KWsResponse
 */
export interface KWsResponse {
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

    /** When soft-deleted (null if active) */
    deletedAt?: string | null;
}

/**
 * Workspace with complete tree hierarchy response
 * Maps to backend WorkspaceWithTreeResponse
 */
export interface KWorkspaceWithTreeResponse {
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

    /** Total number of folders */
    folderCount: number;

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
    items: KWorkspaceItem[];
}

/**
 * Workspace item action enum
 * Eliminates ambiguity in API requests (e.g., move to root with parentId=null vs restore)
 * Follows Microsoft Graph API pattern for batch operations
 */
export enum KItemAction {
    /** CREATE new entity + workspace_item */
    Create = "CREATE",
    /** ADD existing entity to workspace */
    Add = "ADD",
    /** MOVE workspace_item to new location (within same workspace) */
    Move = "MOVE",
    /** MOVE CROSS workspace_item to another workspace (updates workspaceId + parentId + all descendants) */
    MoveCross = "MOVECROSS",
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
 * Pattern: 100% follows backend KUpsertWorkspaceItemRequest
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
 * 4. MOVE_CROSS (move to another workspace):
 *    Required: action=MoveCross, id, workspaceId (target workspace)
 *    Optional: parentId (target parent in new workspace, null = root)
 *    Updates workspace_id for item and ALL descendants recursively
 *    Example: { action: "MOVE_CROSS", id: 789, workspaceId: 5, parentId: 123 }
 *    Example: { action: "MOVE_CROSS", id: 789, workspaceId: 5, parentId: null } ← to root of workspace 5
 *
 * 5. UPDATE_FOLDER (update folder properties - FOLDER ONLY):
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
export interface KUpsertWorkspaceItemRequest {
    /** Explicit action to perform on workspace item */
    action: KItemAction;

    /** Workspace item ID - Required for: Move, MoveCross, Update, Delete, Restore */
    id?: number | null;

    /** Workspace ID (target workspace for MoveCross, set by controller from route for other actions) */
    workspaceId?: number | null;

    /** User ID (set by controller from JWT) */
    userId?: number;

    /** Parent workspace_item ID (SELF-REFERENCING) - Required for: Move, Optional for: MoveCross, Create, Add */
    parentId?: number | null;

    /** Entity type: 2=folder, 3=note, 4=file - Required for: Create, Add */
    entityType?: 2 | 3 | 4;

    /** Entity ID (references existing folder/note/file from entity tables) - Required for: Add */
    entityId?: number;


    /** User email (set by controller) */
    createdBy?: string;

    /** Folder entity data - Required for: Create (entityType=2), Update (entityType=2) */
    folderData?: KUpsertFolderData;

    /** Note entity data - Required for: Create (entityType=3), Update (entityType=3) */
    noteData?: KUpsertNoteData;

    /** File entity data - Required for: Create (entityType=4), Update (entityType=4) */
    fileData?: KUpsertFileData;
}

/** Folder entity data for batch upsert */
export interface KUpsertFolderData {
    id?: number;
    userId?: number;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    deletedAt?: string | null;
}

/** Note entity data for batch upsert */
export interface KUpsertNoteData {
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
export interface KUpsertFileData {
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
