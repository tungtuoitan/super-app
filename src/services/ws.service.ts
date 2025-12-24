/**
 * Workspace Service - API communication for workspace list operations
 * Uses native fetch API without TanStack Query
 */

import { config } from '@/config/app.config';

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
 * GET /api/WorkspaceList?searchText=...&getAll=...
 * 
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of workspaces or rejects with response
 */
export const _getWsList = async (
    token: string,
    params?: {
        getAll?: boolean;
        searchText?: string;
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

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/WorkspaceList?${queryString}`
        : `${config.api.baseURL}/api/WorkspaceList`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = await res.json() as ResultOptions<WsDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Get single workspace by ID
 * GET /api/WorkspaceList/{id}
 *
 * @param token - Authentication token
 * @param id - The workspace ID to retrieve
 * @returns Workspace details or rejects with response
 */
export const _getWsById = async (token: string, id: number) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(
        `${config.api.baseURL}/api/WorkspaceList/${id}`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions<WsDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Upsert workspace (create or update)
 * POST /api/WorkspaceList
 * Backend determines create vs update based on id (0 or null = create, >0 = update)
 *
 * @param token - Authentication token
 * @param data - Workspace upsert data
 * @returns Created or updated workspace or rejects with response
 */
export const _upsertWs = async (
    token: string,
    data: {
        id?: number | null; // 0 or null = create new, > 0 = update existing
        name: string;
        description?: string | null;
        userId?: number;
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
        `${config.api.baseURL}/api/WorkspaceList`,
        options
    );

    if (res.ok) {
        const result = await res.json() as ResultOptions<WsDTO>;
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Delete single or multiple workspaces with CASCADE to all items
 * DELETE /api/WorkspaceList/{id}?isHardDelete=false
 * 
 * @param token - Authentication token
 * @param id - Single workspace ID or comma-separated IDs (e.g., "1,2,3")
 * @param isHardDelete - Hard delete flag (default: false = soft delete)
 * @returns void or rejects with response
 */
export const _deleteWs = async (
    token: string,
    id: number | string,
    isHardDelete: boolean = false
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const queryParams = new URLSearchParams();
    queryParams.append('isHardDelete', String(isHardDelete));

    const options = {
        method: "DELETE",
        headers: headers,
    };

    const res = await window.fetch(
        `${config.api.baseURL}/api/WorkspaceList/${id}?${queryParams.toString()}`,
        options
    );

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Undo delete (restore) single or multiple workspaces
 * POST /api/WorkspaceList/undo/{id}
 * 
 * @param token - Authentication token
 * @param id - Single workspace ID or comma-separated IDs (e.g., "1,2,3")
 * @returns void or rejects with response
 */
export const _undoDeleteWs = async (
    token: string,
    id: number | string
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
        `${config.api.baseURL}/api/WorkspaceList/undo/${id}`,
        options
    );

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};
