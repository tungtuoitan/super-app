/**
 * K.types.ts — K item action types and request/response interfaces
 */

import { kconstants } from "../utils/K.Constants";

// ============================================
// ACTION ENUM
// ============================================

/**
 * K item action — maps to backend KWorkspaceItemAction enum (case-insensitive)
 */
export enum KItemAction {
    Create    = "create",
    Update    = "update",
    Move      = "move",
    MoveCross = "movecross",
    Delete    = "delete",
    Restore   = "restore",
}

// ============================================
// NODE UPSERT DATA
// ============================================

/** Node data for Create / Update actions */
export interface KUpsertNodeData {
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
}

// ============================================
// BATCH UPSERT REQUEST
// ============================================

/**
 * Action-based request for K item batch API (POST /{workspaceId}/items/batch)
 *
 * CREATE:     action, nodeData required; parentId optional (null = root)
 * UPDATE:     action, id, nodeData required
 * MOVE:       action, id, parentId required
 * MOVECROSS:  action, id, workspaceId required; parentId optional
 * DELETE:     action, id required
 * RESTORE:    action, id required
 */
export interface KUpsertWorkspaceItemRequest {
    /** Explicit action */
    action: KItemAction;

    /** kws.workspace_items.id — required for Update/Move/MoveCross/Delete/Restore */
    id?: number | null;

    /** Target workspace ID — set from route for most actions; override for MoveCross */
    workspaceId?: number | null;

    /** Parent kws.workspace_items.id — null = root level */
    parentId?: number | null;

    /** Node data — required for Create and Update */
    nodeData?: KUpsertNodeData;
}

// ============================================
// MOVE REQUEST
// ============================================

/** Request to move items within or across workspaces (PATCH /{workspaceId}/items/move) */
export interface KMoveItemsRequest {
    /** kws.workspace_items.id list to move */
    itemIds: number[];
    targetParentId?: number | null;
    targetWorkspaceId?: number | null;
}

// ============================================
// DELETE REQUEST
// ============================================

/** Request to delete items (DELETE /{workspaceId}/items) */
export interface KDeleteItemsRequest {
    /** kws.workspace_items.id list to delete */
    itemIds: number[];
}

// ============================================
// OPERATION RESULT
// ============================================

export interface KOperationResult {
    success: boolean;
    message?: string;
    status?: number;
    object?: any;
}

// ============================================
// K LIST ITEM (for workspace selector)
// ============================================

/** K workspace item for list/selector — maps to backend WsResponse */
export interface KWsResponse {
    id: number;
    userId: number;
    name: string;
    description?: string;
    statusCode?: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

/** K workspace domain model with Date objects */
export interface KWs {
    id: number;
    name: string;
    description?: string | null;
    statusCode?: string;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt: Date | null;
    userId?: number;
}

// ============================================
// LEGACY — @deprecated, remove after refactor
// ============================================

/** @deprecated Legacy V1 type — use KItemV2 from K-v2.types */
export type ChildType = typeof kconstants.workspace.itemTypes.node | typeof kconstants.workspace.itemTypes.k;

/** @deprecated V1 metadata stub */
export interface KFolderMetadata { [key: string]: unknown; }
/** @deprecated V1 metadata stub */
export interface KNoteMetadata { [key: string]: unknown; }
/** @deprecated V1 metadata stub */
export interface KFileMetadata { [key: string]: unknown; }

/** @deprecated V1 node item — kept for K-mapper.ts backward compat */
export interface FolderItem {
    id: number;
    type: string;
    userId: number;
    name: string;
    parentId?: number | null;
    slug?: string;
    color?: string;
    icon?: string;
    accessType: "owner" | "shared";
    isOriginal: boolean;
    level: number;
    depth: number;
    position: number;
    sortOrder: number;
    isExpanded: boolean;
    isSelected: boolean;
    createdAt: string;
    updatedAt?: string;
    metadata?: KFolderMetadata;
    children: FolderItem[];
}

/** @deprecated V1 stub — K has no notes */
export interface NoteItem {
    id: number;
    type: string;
    userId: number;
    name: string;
    parentId?: number | null;
    slug?: string;
    color?: string;
    icon?: string;
    accessType: "owner" | "shared";
    isOriginal: boolean;
    level: number;
    depth: number;
    position: number;
    sortOrder: number;
    isExpanded: boolean;
    isSelected: boolean;
    createdAt: string;
    updatedAt?: string;
    metadata?: KNoteMetadata;
    children: never[];
}

/** @deprecated V1 stub — K has no files */
export interface FileItem {
    id: number;
    type: string;
    userId: number;
    name: string;
    parentId?: number | null;
    slug?: string;
    color?: string;
    icon?: string;
    accessType: "owner" | "shared";
    isOriginal: boolean;
    level: number;
    depth: number;
    position: number;
    sortOrder: number;
    isExpanded: boolean;
    isSelected: boolean;
    createdAt: string;
    updatedAt?: string;
    metadata?: KFileMetadata;
    children: never[];
}

/** @deprecated V1 union — kept for K-mapper.ts backward compat */
export type KWorkspaceItem = FolderItem | NoteItem | FileItem;
