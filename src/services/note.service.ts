/**
 * Note Service - API communication for note operations
 * Uses native fetch API without TanStack Query
 */

import { API_CONFIG } from '@/config/api.config';
import type { ResultOptions, NoteDTO } from '@/types/note.types';

/**
 * Get all notes with optional filtering
 * GET /api/notes?searchText=...&page=...&pageSize=...&type=...&isArchived=...&getAll=...
 * 
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of notes or rejects with response
 */
export const _getNotes = async (
    token: string,
    params?: {
        getAll?: boolean;
        searchText?: string;
        page?: number;
        pageSize?: number;
        type?: string;
        isArchived?: boolean;
    }
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.getAll !== undefined) {
        queryParams.append('getAll', String(params.getAll));
    }
    if (params?.searchText) {
        queryParams.append('searchText', params.searchText);
    }
    if (params?.page !== undefined) {
        queryParams.append('page', String(params.page));
    }
    if (params?.pageSize !== undefined) {
        queryParams.append('pageSize', String(params.pageSize));
    }
    if (params?.type) {
        queryParams.append('type', params.type);
    }
    if (params?.isArchived !== undefined) {
        queryParams.append('isArchived', String(params.isArchived));
    }

    const queryString = queryParams.toString();
    const url = queryString
        ? `${API_CONFIG.baseURL}/api/notes?${queryString}`
        : `${API_CONFIG.baseURL}/api/notes`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = await res.json() as ResultOptions<NoteDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Get single note by ID
 * GET /api/notes/{noteId}
 *
 * @param token - Authentication token
 * @param noteId - The note ID to retrieve
 * @returns Note details or rejects with response
 */
export const _getNoteById = async (token: string, noteId: number) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/notes/${noteId}`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions<NoteDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Upsert note (create or update) - RECOMMENDED
 * POST /api/notes
 * Backend determines create vs update based on noteId (0 = create, >0 = update)
 *
 * @param token - Authentication token
 * @param data - Note upsert data
 * @returns Created or updated note or rejects with response
 */
export const _upsertNote = async (
    token: string,
    data: {
        id: number; // 0 = create new, > 0 = update existing
        name: string;
        description?: string;
        tags?: number[]; // Backend expects 'tags' in JSON (JsonPropertyName mapping to TagIds)
        type?: string;
        isArchived?: boolean;
    }
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/notes`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions<NoteDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Create new note (legacy - consider using _upsertNote instead)
 * POST /api/notes
 * 
 * @param token - Authentication token
 * @param data - Note creation data
 * @returns Created note or rejects with response
 */
export const _createNote = async (
    token: string,
    data: {
        name: string;
        description?: string;
        type?: string;
        tags?: number[]; // Backend expects 'tags' in JSON (JsonPropertyName mapping to TagIds)
    }
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/notes`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions<NoteDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Update existing note
 * PUT /api/notes/{noteId}
 * 
 * @param token - Authentication token
 * @param noteId - The note ID to update
 * @param data - Note update data
 * @returns Updated note or rejects with response
 */
export const _updateNote = async (
    token: string,
    noteId: number,
    data: {
        noteId: number; // Backend expects noteId in the request body
        name?: string;
        description?: string;
        type?: string;
        tags?: number[]; // Backend expects 'tags' in JSON (JsonPropertyName mapping to TagIds)
        isArchived?: boolean;
    }
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/notes/${noteId}`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions<NoteDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Delete single or multiple notes
 * DELETE /api/notes/{noteId} or /api/notes/{id1,id2,id3}
 * 
 * @param token - Authentication token
 * @param noteId - Single note ID or comma-separated IDs
 * @returns void or rejects with response
 */
export const _deleteNote = async (
    token: string,
    noteId: number | string
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "DELETE",
        headers: headers,
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/notes/${noteId}`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Undo delete (restore) single or multiple notes
 * POST /api/notes/undo/{noteId} or /api/notes/undo/{id1,id2,id3}
 * 
 * @param token - Authentication token
 * @param noteId - Single note ID or comma-separated IDs
 * @returns void or rejects with response
 */
export const _undoDeleteNote = async (
    token: string,
    noteId: number | string
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/notes/undo/${noteId}`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};