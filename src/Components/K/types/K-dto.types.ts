import { KItemV2 } from "./K-v2.types";

/**
 * KDTO — unified K (knowledge) DTO
 * Contains K metadata + flat list of node items
 */
export interface KDTO {
    // ── K table properties ────────────────────────────────────────────────────

    /** K ID (workspaces.id → future: k.id) */
    id: number;

    /** Owner user ID */
    userId: number;

    /** K name */
    name: string;

    /** K description */
    description?: string;

    /** Hex color */
    color?: string;

    /** Icon */
    icon?: string;

    type?: string;
    maxDepth?: number;
    isDefault: boolean;
    isPublic: boolean;
    isTemplate: boolean;
    isArchived: boolean;

    /** Total number of nodes */
    nodeCount: number;

    memberCount: number;
    settings?: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;

    // ── Node items ────────────────────────────────────────────────────────────

    /**
     * Flat list of k items — frontend builds hierarchy using parentId
     */
    flatData: KItemV2[];
}

// @deprecated alias — remove after Phase 2 store rename
/** @deprecated Use KDTO */
export type KWorkspaceDTO = KDTO;
