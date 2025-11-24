/**
 * Notes Feature Types
 * Domain models and DTOs for the notes feature
 */

import type { Tag } from '@/Components/Tags/tag.types';

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
// Backend returns: NoteId, Name, Description, Tags, Type, CreatedAt, UpdatedAt, IsArchived
export interface Note {
    noteId: number;
    name: string;
    description?: string;
    tags: Tag[]; // Array of Tag objects
    type?: string; // Changed from NoteType to string to match backend
    createdAt: Date;
    updatedAt?: Date;
    isArchived: boolean;
    createdBy?: string; // Optional - may be removed from backend response for security
}

// API DTOs (what backend sends/receives)
// Matches backend NoteResponse DTO exactly
export interface NoteDTO {
    noteId: number;
    name: string;
    description?: string;
    tags: Tag[]; // Array of Tag objects from backend
    type?: string; // String type to match backend response
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
    isArchived: boolean;
    createdBy?: string; // Optional - may be removed from backend response for security
}

// Request DTOs
// Matches backend CreateNoteRequest with JsonPropertyName("tags") mapping
export interface CreateNoteDTO {
    name: string;
    description?: string;
    tags?: number[]; // Tag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    type?: string;
}

// Matches backend UpdateNoteRequest with JsonPropertyName("tags") mapping
export interface UpdateNoteDTO {
    name?: string;
    description?: string;
    tags?: number[]; // Tag IDs - backend expects 'tags' in JSON (maps to TagIds property)
    type?: string;
    isArchived?: boolean;
}

// Query parameters
export interface GetNotesParams {
    page?: number;
    pageSize?: number;
    searchText?: string;
    getAll?: boolean;
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