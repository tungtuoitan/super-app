/**
 * Notes Feature Types
 * Domain models and DTOs for the notes feature
 */

import type { Folder, NoteEntity } from "@/features/workspace";

/**
 * Workspace link - represents a workspace that references this note
 * Used to show which workspaces contain a reference to this note
 */
export interface WorkspaceLink {
    workspaceId: number;
    workspaceName: string;
    workspaceItemId: number; // workspace_items.id
}

// Note types
export type NoteType = "meeting" | "brainstorm" | "research" | "bug" | "task" | "idea";

// Available note types
export const NOTE_TYPES: readonly NoteType[] = ["meeting", "brainstorm", "research", "bug", "task", "idea"] as const;

/**
 * Note domain model (extends NoteEntity with UI state & business logic)
 * Use this for in-app state management and UI components
 * Backend returns: Id, Name, Description, Tags, Type, StatusCode, Icon, Color, CreatedAt, UpdatedAt, DeletedAt
 */
export interface Note extends Omit<NoteEntity, 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'workspaceLinks'> {
    // Override userId to optional (not always available when transforming from WorkspaceItem)
    userId?: number;

    // Override date types from ISO string to Date for domain model
    createdAt: Date;
    updatedAt?: Date;
    deletedAt: Date | null;

    // Visual styling (inherited from NoteEntity, but explicitly listed for clarity)
    icon?: string; // Icon type for visual display
    color?: string; // Hex color code for icon

    // Business logic fields (not in entity)
    hashtags: string; // Array of Folder objects (note's hashtags)
    type?: string; // Note type (meeting, brainstorm, etc.)
    isHardDeleted?: boolean; // Track if note is permanently deleted (hard delete)
    createdBy?: string; // Optional - may be removed from backend response for security
    workspaceLinks?: WorkspaceLink[]; // List of workspaces that link to this note
}

// API DTOs (what backend sends/receives)
// Matches backend NoteResponse DTO exactly
export interface NoteDTO {
    id: number; // Backend returns 'id' (from NoteResponse.Id)
    name: string;
    userId: number; // ID of the user who owns the note
    description?: string;
    hashtags: string; // Array of Folder objects (note's hashtags)
    type?: string; // String type to match backend response
    statusCode?: string; // Note status (foreign key to standard_registries.code)
    icon?: string; // Icon type for visual display
    color?: string; // Hex color code for icon
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
    deletedAt?: string; // ISO string (nullable DateTime from backend)
    createdBy?: string; // Optional - may be removed from backend response for security
    workspaceLinks?: WorkspaceLink[]; // List of workspaces that link to this note
}

// Request DTOs
// Matches backend CreateNoteRequest with JsonPropertyName("tags") mapping
export interface CreateNoteDTO {
    name: string;
    description?: string;
    tags?: number[]; // Backend field name: Hashtag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    type?: string;
    statusCode?: string; // Note status
    icon?: string; // Icon type for visual display
    color?: string; // Hex color code for icon
}

// Matches backend UpdateNoteRequest with JsonPropertyName("tags") mapping
export interface UpdateNoteDTO {
    name?: string;
    description?: string;
    tags?: number[]; // Backend field name: Hashtag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    type?: string;
    statusCode?: string; // Note status
    icon?: string; // Icon type for visual display
    color?: string; // Hex color code for icon
    isArchived?: boolean;
}

// Matches backend UpsertNoteRequest - unified create/update/soft delete/restore
export interface UpsertNoteDTO {
    id: number; // 0 = create new, > 0 = update/soft delete/restore
    name: string;
    description?: string;
    tags?: number[]; // Backend field name: Hashtag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    type?: string;
    statusCode?: string; // Note status
    icon?: string; // Icon type for visual display
    color?: string; // Hex color code for icon
    isArchived?: boolean;
    deletedAt?: string | null; // ISO string for soft delete, null for restore, undefined for regular update
}

// Query parameters
export interface GetNotesParams {
    page?: number;
    pageSize?: number;
    searchText?: string;
    type?: string;
    isArchived?: boolean;
}

// API Response wrapper
export interface NotesResponse {
    data: NoteDTO[];
    success: boolean;
    message?: string;
}

export interface NoteResponse {
    data: NoteDTO;
    success: boolean;
    message?: string;
}
