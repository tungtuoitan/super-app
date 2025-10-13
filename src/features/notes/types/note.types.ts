/**
 * Notes Feature Types
 * Domain models and DTOs for the notes feature
 */

import type { Tag } from '@/features/tags/types/tag.types';

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
export interface Note {
    noteId: number;
    name: string;
    description?: string;
    tags: Tag[]; // Array of Tag objects
    type?: string; // Changed from NoteType to string to match backend
    createdBy?: string;
    createdAt: Date;
    updatedAt?: Date;
    isArchived: boolean;
}

// API DTOs (what backend sends/receives)
export interface NoteDTO {
    noteId: number;
    name: string;
    description?: string;
    tags: Tag[]; // Array of Tag objects from backend
    type?: string; // String type to match backend response
    createdBy?: string;
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
    isArchived: boolean;
}

// Request DTOs
export interface CreateNoteDTO {
    name: string;
    description?: string;
    tags?: number[]; // Tag IDs when creating/updating
    type?: string;
}

export interface UpdateNoteDTO {
    name?: string;
    description?: string;
    tags?: number[]; // Tag IDs when creating/updating
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