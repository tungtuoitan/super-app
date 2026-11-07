/**
 * Workspace Types - Ws domain model and workspace responses
 */

import type { WorkspaceItem } from "./workspaceItem.types";

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

