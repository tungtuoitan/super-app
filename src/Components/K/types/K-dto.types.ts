import { KItemV2 } from "./K-v2.types";

/**
 * Unified KWorkspace DTO
 * Contains workspace data from 'workspaces' table + flat list of workspace items
 * Replaces: KWsResponse, KWorkspaceWithTreeResponse, KWorkspaceWithTreeResponseV2
 */
export interface KWorkspaceDTO {
    // ============================================
    // WORKSPACE TABLE PROPERTIES
    // ============================================

    /** Workspace ID (workspaces.id) */
    id: number;

    /** User ID who owns the workspace (workspaces.user_id) */
    userId: number;

    /** Workspace name (workspaces.name) */
    name: string;

    /** Workspace description (workspaces.description) */
    description?: string;

    /** Hex color code (workspaces.color) */
    color?: string;

    /** Icon name or class (workspaces.icon) */
    icon?: string;

    /** Workspace organization type (workspaces.type) */
    type?: string;

    /** Maximum depth allowed (workspaces.max_depth) */
    maxDepth?: number;

    /** Whether this is the default workspace (workspaces.is_default) */
    isDefault: boolean;

    /** Whether publicly accessible (workspaces.is_public) */
    isPublic: boolean;

    /** Whether this is a template (workspaces.is_template) */
    isTemplate: boolean;

    /** Whether archived (workspaces.is_archived) */
    isArchived: boolean;

    /** Total number of folders (computed) */
    folderCount: number;

    /** Total number of notes (computed) */
    noteCount: number;

    /** Total number of files (computed) */
    fileCount: number;

    /** Number of members (computed) */
    memberCount: number;

    /** Additional settings as JSON (workspaces.settings) */
    settings?: string;

    /** When created (workspaces.created_at) */
    createdAt: string;

    /** When last updated (workspaces.updated_at) */
    updatedAt?: string;

    /** When deleted - soft delete (workspaces.deleted_at) */
    deletedAt?: string | null;

    // ============================================
    // WORKSPACE ITEMS DATA
    // ============================================

    /**
     * FLAT list of workspace items with full entity data
     * Frontend builds hierarchy using parentId
     * Each item has:
     * - Root level: workspace_items table properties (id, workspaceId, parentId, entityType, entityId, ...)
     * - data property: Full entity data (FolderData | NoteData | FileData)
     */
    flatData: KItemV2[];
}
