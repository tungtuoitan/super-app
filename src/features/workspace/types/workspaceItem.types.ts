/**
 * Workspace item types - metadata, items, and type guards
 */

import { workspaceConstants } from "@/features/workspace/workspace.constants";

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
    type: typeof workspaceConstants.itemTypes.folder;

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
    type: typeof workspaceConstants.itemTypes.note;

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
    type: typeof workspaceConstants.itemTypes.file;

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
    return item.type === workspaceConstants.itemTypes.folder;
}

/**
 * Type guard to check if item is a note
 */
export function isNote(item: WorkspaceItem): item is NoteItem {
    return item.type === workspaceConstants.itemTypes.note;
}

/**
 * Type guard to check if item is a file
 */
export function isFile(item: WorkspaceItem): item is FileItem {
    return item.type === workspaceConstants.itemTypes.file;
}

/**
 * Type guard to check if item is a leaf node (note or file)
 */
export function isLeafNode(item: WorkspaceItem): item is NoteItem | FileItem {
    return item.type === workspaceConstants.itemTypes.note || item.type === workspaceConstants.itemTypes.file;
}

/**
 * Type guard to check if item can have children (folder)
 */
export function canHaveChildren(item: WorkspaceItem): item is FolderItem {
    return item.type === workspaceConstants.itemTypes.folder;
}

