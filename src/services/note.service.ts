/**
 * Note Service - API communication for note operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "@/config/app.config";
import type { ResultOptions, NoteDTO } from "@/types/note.types";

/**
 * Get all notes with optional filtering
 * GET /api/notes?searchText=...&page=...&pageSize=...&type=...&isArchived=...
 *
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of notes or rejects with response
 */
const _getNotes = async (
    token: string,
    params?: {
        searchText?: string;
        page?: number;
        pageSize?: number;
        type?: string;
        isArchived?: boolean;
    },
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.searchText) {
        queryParams.append("searchText", params.searchText);
    }
    if (params?.page !== undefined) {
        queryParams.append("page", String(params.page));
    }
    if (params?.pageSize !== undefined) {
        queryParams.append("pageSize", String(params.pageSize));
    }
    if (params?.type) {
        queryParams.append("type", params.type);
    }
    if (params?.isArchived !== undefined) {
        queryParams.append("isArchived", String(params.isArchived));
    }

    const queryString = queryParams.toString();
    const url = queryString ? `${config.api.baseURL}/api/notes?${queryString}` : `${config.api.baseURL}/api/notes`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions<NoteDTO>;
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
const _getNoteById = async (token: string, noteId: number) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(`${config.api.baseURL}/api/notes/${noteId}`, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions<NoteDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Batch upsert multiple notes (create, update, soft delete, or restore)
 * For single note operations, pass an array with 1 element
 * POST /api/notes (accepts both single array and batch array)
 *
 * Operations:
 * - CREATE: id = 0, deletedAt = undefined
 * - UPDATE: id > 0, deletedAt = undefined
 * - SOFT DELETE: id > 0, deletedAt = ISO timestamp string
 * - RESTORE: id > 0, deletedAt = null
 *
 * @param token - Authentication token
 * @param requests - Array of note upsert data
 * @returns Batch operation results or rejects with response
 */
const _upsertNotes = async (
    token: string,
    requests: Array<{
        id: number;
        name: string;
        description?: string;
        tags?: number[];
        type?: string;
        isArchived?: boolean;
        deletedAt?: string | null;
    }>,
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requests),
    };

    const res = await window.fetch(`${config.api.baseURL}/api/notes/batch`, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Hard delete single or multiple notes (permanently removes from database)
 * For soft delete, use _upsertNote with deletedAt timestamp
 * DELETE /api/notes/{noteId} or /api/notes/{id1,id2,id3}
 *
 * @param token - Authentication token
 * @param noteId - Single note ID or comma-separated IDs
 * @returns void or rejects with response
 */
const _deleteNote = async (token: string, noteId: number | string) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "DELETE",
        headers: headers,
    };

    const url = `${config.api.baseURL}/api/notes/${noteId}`;

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};


export const noteService = {
    _getNotes,
    _getNoteById,
    _upsertNotes,
    _deleteNote,
}