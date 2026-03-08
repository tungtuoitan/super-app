/**
 * Workspace Types - Types for workspace folder tree operations
 * Aligns with backend AddItemToWorkspaceRequest and WorkspaceItem
 */

import { constants } from "@/utils/constants";

/**
 * Type aliases for backend API compatibility
 */
export type ChildType = typeof constants.workspace.itemTypes.note | typeof constants.workspace.itemTypes.folder;

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

// ============================================
// METADATA TYPES
// ============================================

/** Folder-specific metadata */
export interface FolderMetadata {
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
export interface NoteMetadata {
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
export interface FileMetadata {
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
interface BaseWorkspaceItem {
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
export interface FolderItem extends BaseWorkspaceItem {
    /** ID of folder */
    id: number;

    /** Type of item */
    type: typeof constants.workspace.itemTypes.folder;

    /** Folder-specific metadata */
    metadata?: FolderMetadata;

    /** Child items (folders, notes, files) */
    children: WorkspaceItem[];
}

/**
 * Note item - always leaf node
 * ✅ id = note ID (NoteId in database)
 * ✅ type = 'note'
 */
export interface NoteItem extends BaseWorkspaceItem {
    /** ID of note */
    id: number;

    /** Type of item */
    type: typeof constants.workspace.itemTypes.note;

    /** Note-specific metadata */
    metadata?: NoteMetadata;

    /** Notes cannot have children */
    children?: never[];
}

/**
 * File item - always leaf node
 * ✅ id = file ID (FileId in database)
 * ✅ type = 'file'
 */
export interface FileItem extends BaseWorkspaceItem {
    /** ID of file */
    id: number;

    /** Type of item */
    type: typeof constants.workspace.itemTypes.file;

    /** File-specific metadata */
    metadata?: FileMetadata;

    /** Files cannot have children */
    children?: never[];
}

/**
 * Discriminated union of all workspace item types
 * Use this for type-safe item handling
 */
export type WorkspaceItem = FolderItem | NoteItem | FileItem;

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if item is a folder
 */
export function isFolder(item: WorkspaceItem): item is FolderItem {
    return item.type === constants.workspace.itemTypes.folder;
}

/**
 * Type guard to check if item is a note
 */
export function isNote(item: WorkspaceItem): item is NoteItem {
    return item.type === constants.workspace.itemTypes.note;
}

/**
 * Type guard to check if item is a file
 */
export function isFile(item: WorkspaceItem): item is FileItem {
    return item.type === constants.workspace.itemTypes.file;
}

/**
 * Type guard to check if item is a leaf node (note or file)
 */
export function isLeafNode(item: WorkspaceItem): item is NoteItem | FileItem {
    return item.type === constants.workspace.itemTypes.note || item.type === constants.workspace.itemTypes.file;
}

/**
 * Type guard to check if item can have children (folder)
 */
export function canHaveChildren(item: WorkspaceItem): item is FolderItem {
    return item.type === constants.workspace.itemTypes.folder;
}

/**
 * Workspace (Ws) interface - domain model with Date objects
 * Used in workspace grid and editor
 */
export interface Ws {
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
 * Maps to backend WsResponse
 */
export interface WsResponse {
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
    items: WorkspaceItem[];
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
export interface UpsertWorkspaceItemRequest {
    /** Explicit action to perform on workspace item */
    action: WorkspaceItemAction;

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
