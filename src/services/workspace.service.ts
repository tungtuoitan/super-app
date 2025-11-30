/**
 * Workspace Service - API communication for workspace operations
 * Uses native fetch API without TanStack Query
 */

import { API_CONFIG } from '@/config/api.config';
import type {
    MoveItemsRequest,
    DeleteItemsRequest,
    WorkspaceOperationResult,
    WorkspaceWithTreeResponse,
    WorkspaceListResponse
} from '@/types/workspace.types';

/**
 * Get all workspaces for the current user
 * GET /api/workspace
 *
 * @param token - Authentication token
 * @returns Array of user's workspaces or rejects with response
 */
export const _getAllUserWorkspaces = async (
    token: string
): Promise<WorkspaceListResponse[]> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/workspace`,
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
 * Get workspace tree with hierarchical structure
 * GET /api/workspace/{workspaceId}/tree
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @returns Workspace tree with all items or rejects with response
 */
export const _getWorkspaceTree = async (
    token: string,
    workspaceId: number
): Promise<WorkspaceWithTreeResponse> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/workspace/${workspaceId}/tree`,
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
 * Get workspace item by ID
 * GET /api/workspace/{workspaceId}/items/{itemId}
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param itemId - The workspace item ID to retrieve
 * @returns Workspace item details or rejects with response
 */
export const _getWorkspaceItem = async (
    token: string,
    workspaceId: number,
    itemId: number
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/workspace/${workspaceId}/items/${itemId}`,
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
 * Upsert (Create or Update) workspace item
 * POST /api/workspace/{workspaceId}/items (create)
 * PUT /api/workspace/{workspaceId}/items/{itemId} (update)
 * 
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param data - Workspace item data
 * @param itemId - Optional item ID for update (if null, creates new)
 * @returns Created/Updated workspace item or rejects with response
 */
export const _upsertWorkspaceItem = async (
    token: string,
    workspaceId: number,
    data: {
        parentTagId?: number | null;
        childType?: 'tag' | 'note' | 'folder';
        childId?: number;
        label?: string;
        notes?: string;
        color?: string;
        icon?: string;
        sortOrder?: number;
    },
    itemId?: number | null
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const isUpdate = itemId !== null && itemId !== undefined;
    const method = isUpdate ? "PUT" : "POST";
    const url = isUpdate
        ? `${API_CONFIG.baseURL}/api/workspace/${workspaceId}/items/${itemId}`
        : `${API_CONFIG.baseURL}/api/workspace/${workspaceId}/items`;

    const options = {
        method: method,
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Move multiple workspace items with cascade support
 * PATCH /api/workspace/{workspaceId}/items/move
 * 
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param data - Move items request data
 * @returns Operation result or rejects with response
 */
export const _moveWorkspaceItems = async (
    token: string,
    workspaceId: number,
    data: MoveItemsRequest
): Promise<WorkspaceOperationResult> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/workspace/${workspaceId}/items/move`,
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
 * Delete multiple workspace items with cascade support
 * DELETE /api/workspace/{workspaceId}/items
 * 
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param data - Delete items request data
 * @returns Operation result or rejects with response
 */
export const _deleteWorkspaceItems = async (
    token: string,
    workspaceId: number,
    data: DeleteItemsRequest
): Promise<WorkspaceOperationResult> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "DELETE",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(
        `${API_CONFIG.baseURL}/api/workspace/${workspaceId}/items`,
        options
    );

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};
