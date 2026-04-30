/**
 * WS Service - API communication for ws list operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "config/app.config";
import {ResultOptions} from "@/shared";
import {apiFetch} from "@/shared";


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
 * GET /api/ws?searchText=...&getAll=...&statusCode=...&deletedAt=...&createdAtFrom=...&createdAtTo=...
 *
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of workspaces or rejects with response
 */
const _getWs = async (
    _token: string,
    params?: {
        getAll?: boolean;
        searchText?: string;
        // Filter parameters
        statusCode?: string; // Comma-separated: "active,inactive"
        deletedAt?: string; // "null" or "notNull"
        createdAtFrom?: string; // ISO date string
        createdAtTo?: string; // ISO date string
        ids?: string; // Comma-separated IDs: "1,2,3"
    },
) => {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.getAll !== undefined) {
        queryParams.append("getAll", String(params.getAll));
    }
    if (params?.searchText) {
        queryParams.append("searchText", params.searchText);
    }
    // Add filter parameters
    if (params?.statusCode) {
        queryParams.append("statusCode", params.statusCode);
    }
    if (params?.deletedAt) {
        queryParams.append("deletedAt", params.deletedAt);
    }
    if (params?.createdAtFrom) {
        queryParams.append("createdAtFrom", params.createdAtFrom);
    }
    if (params?.createdAtTo) {
        queryParams.append("createdAtTo", params.createdAtTo);
    }
    if (params?.ids) {
        queryParams.append("ids", params.ids);
    }

    const queryString = queryParams.toString();
    const url = queryString ? `${config.api.baseURL}/api/ws?${queryString}` : `${config.api.baseURL}/api/ws`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

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
const _getWsById = async (_token: string, id: number) => {
    const res = await apiFetch(`${config.api.baseURL}/api/ws/${id}`, { method: "GET", headers: { "Content-Type": "application/json" } });

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
    _token: string,
    requests: Array<{
        id?: number | null;
        name: string;
        description?: string | null;
        userId?: number;
        deletedAt?: string | null;
    }>,
) => {
    const res = await apiFetch(`${config.api.baseURL}/api/ws/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

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
const _deleteWs = async (_token: string, id: number | string) => {
    const res = await apiFetch(`${config.api.baseURL}/api/ws/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });

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