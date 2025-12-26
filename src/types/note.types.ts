/**
 * Notes Feature Types
 * Domain models and DTOs for the notes feature
 */

import type { Folder } from '@/types/folder.types';

// Backend ResultOptions wrapper (from SuperAppModels.DTOs.ResultOptions)
export interface ResultOptions<T = any> {
    success: boolean;
    message?: string;
    object?: T; // Single object result
    data?: T[]; // Array result
    status?: number;
    reference?: string;
    reference2?: string;
    reference3?: string;
    reference4?: string;
    reference5?: string;
}

// Note types
export type NoteType = 'meeting' | 'brainstorm' | 'research' | 'bug' | 'task' | 'idea';

// Available note types
export const NOTE_TYPES: readonly NoteType[] = [
    'meeting',
    'brainstorm', 
    'research',
    'bug',
    'task',
    'idea'
] as const;

// Domain Model (what we use in the app)
// Backend returns: Id, Name, Description, Tags, Type, CreatedAt, UpdatedAt, DeletedAt
export interface Note {
    id: number;
    name: string;
    description?: string;
    hashtags: Folder[]; // Array of Folder objects (note's hashtags)
    tags?: Folder[]; // DEPRECATED: Use hashtags instead. Kept for backward compatibility
    type?: string; // Changed from NoteType to string to match backend
    createdAt: Date;
    updatedAt?: Date;
    deletedAt: Date | null; // Track if note is deleted (soft delete)
    isHardDeleted?: boolean; // Track if note is permanently deleted (hard delete)
    createdBy?: string; // Optional - may be removed from backend response for security

}

// API DTOs (what backend sends/receives)
// Matches backend NoteResponse DTO exactly
export interface NoteDTO {
    id: number;  // Backend returns 'id' (from NoteResponse.Id)
    name: string;
    description?: string;
    tags: Folder[]; // Backend still uses "tags" field name (array of Folder/Tag objects)
    type?: string; // String type to match backend response
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
    deletedAt?: string; // ISO string (nullable DateTime from backend)
    createdBy?: string; // Optional - may be removed from backend response for security
}

// Request DTOs
// Matches backend CreateNoteRequest with JsonPropertyName("tags") mapping
export interface CreateNoteDTO {
    name: string;
    description?: string;
    tags?: number[]; // Backend field name: Hashtag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    hashtagIds?: number[]; // Frontend alias for tags
    type?: string;
}

// Matches backend UpdateNoteRequest with JsonPropertyName("tags") mapping
export interface UpdateNoteDTO {
    name?: string;
    description?: string;
    tags?: number[]; // Backend field name: Hashtag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    hashtagIds?: number[]; // Frontend alias for tags
    type?: string;
    isArchived?: boolean;
}

// Matches backend UpsertNoteRequest - unified create/update/soft delete/restore
export interface UpsertNoteDTO {
    id: number; // 0 = create new, > 0 = update/soft delete/restore
    name: string;
    description?: string;
    tags?: number[]; // Backend field name: Hashtag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    type?: string;
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