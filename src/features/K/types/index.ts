/**
 * Type Definitions Index
 * Central export for all type definitions
 */

export * from "./common.types";

// Export folder types
export * from "./folder.types";


/**
 * API Client Types
 */
export interface ApiRequestConfig {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, string | number | boolean>;
}

/**
 * Auth API Types
 */
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    username?: string;
    userId?: number;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: UserData;
    error?: string;
    expiresAt?: string;
}

export interface UserData {
    id: number;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    authType: "google" | "local";
    token: string;
    tokenType: string;
    fullName?: string;
    filters?: string;
}

export interface GoogleCodeRequest {
    code: string;
    /** PKCE code verifier - optional for backward compatibility */
    codeVerifier?: string;
}

export interface ExchangeTokenResponse {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}

/**
 * Note Types
 * Re-export from notes feature with aliases for API compatibility
 */
export type { Note, NoteType, NoteDTO, GetNotesParams, NotesResponse } from "@/types/note.types";

// API compatibility aliases
export type { CreateNoteDTO as CreateNoteRequest, UpdateNoteDTO as UpdateNoteRequest, NoteDTO as NoteResponse } from "@/types/note.types";

// Response wrapper type for create/update operations
export interface NoteCreateUpdateResponse {
    data: {
        noteId: number;
        name: string;
        description?: string;
        hashtags: any[]; // Note hashtags (not folder tags)
        type?: string;
        createdAt: string;
        updatedAt?: string;
        isArchived: boolean;
        createdBy?: string;
    };
    success: boolean;
    message?: string;
}
