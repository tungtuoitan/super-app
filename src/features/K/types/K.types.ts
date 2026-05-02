/**
 * K.types.ts — K item action types and request/response interfaces
 */

import { kconstants } from "../utils/K.Constants";
import { workspaceConstants } from "@/features/workspace/workspace.constants";

// ============================================
// ACTION ENUM
// ============================================

/**
 * K node action — maps to backend KNodeAction enum (case-insensitive)
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
    /** Only applicable when nodeType = "entity" */
    icon?: string | null;
    /** Node type — "entity" | "question" | null */
    nodeType?: "entity" | "question" | null;
    /** Workflow status — "draft" | null (active). Pass null to activate a draft node. */
    statusCode?: string | null;
}

// ============================================
// BATCH UPSERT REQUEST
// ============================================

/**
 * Action-based request for K node batch API (POST /{knowledgeId}/nodes/batch)
 *
 * CREATE:     action, nodeData required; parentId optional (null = root)
 * UPDATE:     action, id, nodeData required
 * MOVE:       action, id, parentId required
 * MOVECROSS:  action, id, knowledgeId required; parentId optional
 * DELETE:     action, id required
 * RESTORE:    action, id required
 */
export interface KUpsertWorkspaceItemRequest {
    /** Explicit action */
    action: KItemAction;

    /** k.node.id — required for Update/Move/MoveCross/Delete/Restore */
    id?: number | null;

    /** Target knowledge ID — set from route for most actions; override for MoveCross */
    knowledgeId?: number | null;

    /** Parent k.node.id — null = root level */
    parentId?: number | null;

    /** Node data — required for Create and Update */
    nodeData?: KUpsertNodeData;
}

// ============================================
// DELETE REQUEST
// ============================================

/** Request to delete nodes (DELETE /{knowledgeId}/nodes) */
export interface KDeleteItemsRequest {
    /** k.node.id list to delete */
    nodeIds: number[];
}

// ============================================
// MOVE REQUEST (currently unused — handled via batch)
// ============================================

/** @deprecated Use batch upsert with MoveCross action instead */
export interface KMoveItemsRequest {
    nodeIds: number[];
    targetParentId?: number | null;
    targetKnowledgeId?: number | null;
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
// K LIST ITEM (for knowledge selector)
// ============================================

/** Knowledge summary — maps to backend KKnowledgeSummary */
export interface KWsResponse {
    id: number;
    userId: number;
    name: string;
    description?: string;
    imageBase64?: string;
    statusCode?: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

/** K knowledge domain model with Date objects */
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
export type ChildType = typeof workspaceConstants.itemTypes.node | typeof workspaceConstants.itemTypes.k;

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




