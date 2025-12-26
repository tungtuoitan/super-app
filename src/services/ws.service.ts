/**
 * WS Service - API communication for ws list operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "@/config/app.config";

/**
 * ResultOptions interface for API responses
 */
export interface ResultOptions<T = any> {
    success: boolean;
    message?: string;
    data?: T[];
    object?: T;
    status: number;
}

/**
 * Workspace DTO from API (dates as strings)
 */
export interface WsDTO {
    id: number;
    name: string;
    description?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
    userId?: number;
}

/**
 * Get all workspaces with optional filtering
 * GET /api/ws?searchText=...&getAll=...
 *
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of workspaces or rejects with response
 */
const _getWs = async (
    token: string,
    params?: {
        getAll?: boolean;
        searchText?: string;
    },
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.getAll !== undefined) {
        queryParams.append("getAll", String(params.getAll));
    }
    if (params?.searchText) {
        queryParams.append("searchText", params.searchText);
    }

    const queryString = queryParams.toString();
    const url = queryString ? `${config.api.baseURL}/api/ws?${queryString}` : `${config.api.baseURL}/api/ws`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions<WsDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Get single workspace by ID
 * GET /api/ws/{id}
 *
 * @param token - Authentication token
 * @param id - The workspace ID to retrieve
 * @returns Workspace details or rejects with response
 */
const _getWsById = async (token: string, id: number) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(`${config.api.baseURL}/api/ws/${id}`, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions<WsDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Batch upsert multiple workspaces (create, update, soft delete, or restore)
 * For single workspace operations, pass an array with 1 element
 * POST /api/ws (accepts both single array and batch array)
 *
 * Operations:
 * - CREATE: id = 0 or null, deletedAt = undefined
 * - UPDATE: id > 0, deletedAt = undefined
 * - SOFT DELETE: id > 0, deletedAt = ISO timestamp string
 * - RESTORE: id > 0, deletedAt = null
 *
 * @param token - Authentication token
 * @param requests - Array of workspace upsert data
 * @returns Batch operation results or rejects with response
 */
const _upsertWsBatch = async (
    token: string,
    requests: Array<{
        id?: number | null;
        name: string;
        description?: string | null;
        userId?: number;
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

    const res = await window.fetch(`${config.api.baseURL}/api/ws/batch`, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Hard delete single or multiple workspaces (permanently removes from database)
 * For soft delete, use _upsertWs with deletedAt timestamp
 * DELETE /api/ws/{id} or /api/ws/{id1,id2,id3}
 *
 * @param token - Authentication token
 * @param id - Single workspace ID or comma-separated IDs (e.g., "1,2,3")
 * @returns void or rejects with response
 */
const _deleteWs = async (token: string, id: number | string) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "DELETE",
        headers: headers,
    };

    const url = `${config.api.baseURL}/api/ws/${id}`;

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};

export const wsService = {
    _getWs,
    _getWsById,
    _upsertWsBatch,
    _deleteWs,
}