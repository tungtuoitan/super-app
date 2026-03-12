import { KItemV2 } from "./K-v2.types";

/**
 * KDTO — unified K workspace DTO
 * Maps to backend KWorkspaceDTO (kws.workspaces + flat list of kws.workspace_items)
 */
export interface KDTO {
    /** kws.workspaces.id */
    id: number;

    /** Owner user ID */
    userId: number;

    /** Workspace name */
    name: string;

    /** Workspace description */
    description?: string | null;

    /** Hex color */
    color?: string | null;

    /** Icon */
    icon?: string | null;

    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;

    /**
     * Flat list of nodes. Frontend builds hierarchy using parentId.
     * Each item maps to one kws.workspace_items row.
     */
    flatData: KItemV2[];
}
