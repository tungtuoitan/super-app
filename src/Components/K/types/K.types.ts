/**
 * K.types.ts — K item action types and request/response interfaces
 */

import { kconstants } from "../utils/K.Constants";

// ============================================
// ACTION ENUM
// ============================================

/**
 * K item action — explicit action for batch API
 * Maps to backend KWorkspaceItemAction enum
 */
export enum KItemAction {
    /** Create new node + k_item */
    Create = "CREATE",
    /** Add existing entity to K */
    Add = "ADD",
    /** Move k_item within same K */
    Move = "MOVE",
    /** Move k_item to another K */
    MoveCross = "MOVECROSS",
    /** Update node data (name, description, color, icon) */
    UpdateNode = "UPDATENODE",
    /** Soft delete k_item */
    Delete = "DELETE",
    /** Restore deleted k_item */
    Restore = "RESTORE",

    // @deprecated — keep for backward compat with backend until Phase 4
    /** @deprecated Use UpdateNode */
    UpdateFolder = "UPDATEFOLDER",
}

// ============================================
// NODE UPSERT DATA
// ============================================

/** Node entity data for batch upsert */
export interface KUpsertNodeData {
    id?: number;
    userId?: number;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    deletedAt?: string | null;
}

// @deprecated alias — remove after Phase 4 backend cleanup
/** @deprecated Use KUpsertNodeData */
export type KUpsertFolderData = KUpsertNodeData;

// ============================================
// BATCH UPSERT REQUEST
// ============================================

/**
 * Action-based request for K item batch operations
 *
 * VALIDATION RULES:
 * CREATE:     action, entityType=2, nodeData required; parentId optional (null=root)
 * MOVE:       action, id, parentId required
 * MOVECROSS:  action, id, workspaceId required; parentId optional
 * UPDATENODE: action, id, nodeData required
 * DELETE:     action, id required
 * RESTORE:    action, id required
 */
export interface KUpsertWorkspaceItemRequest {
    /** Explicit action */
    action: KItemAction;

    /** k_items.id — required for Move, UpdateNode, Delete, Restore */
    id?: number | null;

    /** K ID — target for MoveCross, set from route for others */
    workspaceId?: number | null;

    /** User ID — set from JWT */
    userId?: number;

    /** Parent k_items.id (SELF-REFERENCING) */
    parentId?: number | null;

    /** entityType: 2 = node */
    entityType?: 2;

    /** Entity ID — for Add action */
    entityId?: number;

    /** User email — set by controller */
    createdBy?: string;

    /** Node data — required for Create and UpdateNode */
    nodeData?: KUpsertNodeData;

    // @deprecated — kept for backward compat with backend until Phase 4
    /** @deprecated Use nodeData */
    folderData?: KUpsertNodeData;
}

// ============================================
// MOVE / DELETE REQUEST HELPERS
// ============================================

/** Single item identifier for move */
export interface KMoveItemIdentifier {
    /** entityType: 2 = node */
    type: 2;
    /** k_items.id */
    id: number;
}

/** Request to move multiple k items */
export interface KMoveItemsRequest {
    items: KMoveItemIdentifier[];
    targetParentId?: number | null;
    targetWorkspaceId?: number | null;
}

/** Single item for delete */
export interface DeleteItemRequest {
    id: number;
    /** entityType: 2 = node */
    type: 2;
}

/** Request to delete multiple k items */
export interface KDeleteItemsRequest {
    items: DeleteItemRequest[];
    cascade?: boolean;
    isHardDelete?: boolean;
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

// @deprecated alias
/** @deprecated Use KOperationResult */
export type KWorkspaceOperationResult = KOperationResult;

// ============================================
// K LIST ITEM (for dropdown/selector)
// ============================================

/** K item for list/selector — maps to backend KWsResponse */
export interface KWsResponse {
    id: number;
    userId: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

/** K domain model with Date objects */
export interface KWs {
    id: number;
    name: string;
    description?: string | null;
    statusCode?: string;
    hashtags?: string;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt: Date | null;
    isHardDeleted?: boolean;
    userId?: number;
    createdBy?: string;
}

// ============================================
// LEGACY — @deprecated, remove after Phase 3
// ============================================

/** @deprecated Legacy V1 type — use KItemV2 from K-v2.types */
export type ChildType = typeof kconstants.workspace.itemTypes.node | typeof kconstants.workspace.itemTypes.k;
