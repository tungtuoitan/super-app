/**
 * Workspace Service - API communication for workspace operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "@/config/app.config";
import type { MoveItemsRequest, DeleteItemsRequest, WorkspaceOperationResult, WorkspaceWithTreeResponse, WsResponse, UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { WorkspaceItemAction } from "@/types/workspace.types";
import { constants } from "@/utils/constants";
import _ from "lodash";
import {ResultOptions} from "../types";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";

/**
 * Request to create or update a folder in workspace
 * Maps to backend UpsertFolderRequest
 */
export interface UpsertFolderRequest {
    id?: number | null; // If provided, updates existing folder
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: number | null; // Parent folder ID (null for root) - consistent with CreateFolderDTO/UpdateFolderDTO
}

/**
 * Get all workspaces for the current user
 * GET /api/workspace
 *
 * @param token - Authentication token
 * @returns Array of user's workspaces or rejects with response
 */
const _getAllUserWorkspaces = async (token: string): Promise<WsResponse[]> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(`${config.api.baseURL}/api/workspace`, options);

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
const _getWorkspaceTree = async (token: string, workspaceId: number): Promise<WorkspaceWithTreeResponse> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(`${config.api.baseURL}/api/workspace/${workspaceId}/tree`, options);

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Filter parameters for workspace tree
 */
export interface WorkspaceTreeParams {
    statusCode?: string;
    deletedAt?: string;
}

/**
 * Get workspace tree with V2 structure (full entity data embedded)
 * GET /api/workspace/{workspaceId}/tree/v2
 *
 * Returns unified WorkspaceDTO with workspace data + flatData
 * Supports filtering by status code (for notes/files) and deleted status
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param params - Optional filter parameters (statusCode, deletedAt)
 * @returns Unified WorkspaceDTO with workspace properties and flatData array
 */
const _getWorkspaceTreeV2 = async (
    token: string,
    workspaceId: number,
    params?: WorkspaceTreeParams
): Promise<ResultOptions<WorkspaceDTO>> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params?.statusCode) {
        queryParams.append("statusCode", params.statusCode);
    }
    if (params?.deletedAt) {
        queryParams.append("deletedAt", params.deletedAt);
    }

    const queryString = queryParams.toString();
    const url = `${config.api.baseURL}/api/workspace/${workspaceId}/tree/v2${
        queryString ? `?${queryString}` : ""
    }`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = (await res.json()) as ResultOptions<WorkspaceDTO>;
        // Backend returns ResultOptions { success, message, status, object }
        // Extract the WorkspaceDTO from 'object' property
        return result;
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
const _getWorkspaceItem = async (token: string, workspaceId: number, itemId: number) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items/${itemId}`, options);

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
const _upsertWorkspaceItem = async (
    token: string,
    workspaceId: number,
    data: {
        parentTagId?: number | null;
        childType?: typeof constants.workspace.itemTypes.note | typeof constants.workspace.itemTypes.folder;
        childId?: number;
        label?: string;
        notes?: string;
        color?: string;
        icon?: string;
        sortOrder?: number;
    },
    itemId?: number | null,
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const isUpdate = itemId !== null && itemId !== undefined;
    const method = isUpdate ? "PUT" : "POST";
    const url = isUpdate ? `${config.api.baseURL}/api/workspace/${workspaceId}/items/${itemId}` : `${config.api.baseURL}/api/workspace/${workspaceId}/items`;

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
// const _moveWorkspaceItems = async (token: string, workspaceId: number, data: MoveItemsRequest): Promise<WorkspaceOperationResult> => {
//     const headers = new Headers();
//     const bearer = `Bearer ${token}`;

//     headers.append("Authorization", bearer);
//     headers.append("Content-Type", "application/json");

//     const options = {
//         method: "PATCH",
//         headers: headers,
//         body: JSON.stringify(data),
//     };

//     const res = await window.fetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items/move`, options);

//     if (res.ok) {
//         const ret = await res.json();
//         return ret;
//     } else {
//         return Promise.reject(res);
//     }
// };

/**
 * Delete multiple workspace items with cascade support
 * DELETE /api/workspace/{workspaceId}/items
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param data - Delete items request data
 * @returns Operation result or rejects with response
 */
const _deleteWorkspaceItems = async (token: string, workspaceId: number, data: DeleteItemsRequest): Promise<WorkspaceOperationResult> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "DELETE",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items`, options);

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Create or update a folder in workspace
 * POST /api/workspace/{workspaceId}/folders
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param data - Folder data (name, description, color, etc.)
 * @returns Operation result or rejects with response
 */
const _upsertFolder = async (token: string, workspaceId: number, data: UpsertFolderRequest): Promise<WorkspaceOperationResult> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(`${config.api.baseURL}/api/workspace/${workspaceId}/folders`, options);

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Add an item (folder/note/file) to workspace
 * POST /api/workspace/{workspaceId}/items
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID
 * @param data - Item data (childType, childId, etc.)
 * @returns Operation result or rejects with response
 */
// const _addItemToWorkspace = async (
//     token: string,
//     workspaceId: number,
//     data: {
//         parentTagId?: number | null;
//         childType: typeof constants.workspace.itemTypes.note | typeof constants.workspace.itemTypes.folder
//         childId?: number;
//         folderName?: string;
//         label?: string;
//         notes?: string;
//         color?: string;
//         icon?: string;
//         sortOrder?: number;
//     },
// ): Promise<WorkspaceOperationResult> => {
//     const headers = new Headers();
//     const bearer = `Bearer ${token}`;

//     headers.append("Authorization", bearer);
//     headers.append("Content-Type", "application/json");

//     const options = {
//         method: "POST",
//         headers: headers,
//         body: JSON.stringify(data),
//     };

//     const res = await window.fetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items`, options);

//     if (res.ok) {
//         const ret = await res.json();
//         return ret;
//     } else {
//         return Promise.reject(res);
//     }
// };

/**
 * Batch upsert workspace items with action-based operations
 * POST /api/workspace/{workspaceId}/items/batch
 * Pattern: Action-based API (Microsoft Graph style)
 *
 * Supports 6 actions: Create, Add, Move, Update, Delete, Restore
 *
 * ID NAMING CONVENTION:
 * - id: workspace_items.id (workspace item ID - used for Update, Move, Delete, Restore)
 * - parentId: parent's workspace_items.id (SELF-REFERENCING, NOT entity ID!)
 * - entityId: entity ID (folders.id | notes.id | files.id)
 *
 * @param token - Authentication token
 * @param workspaceId - The workspace ID (workspaces.id)
 * @param requests - Array of workspace item requests with explicit actions
 * @returns Batch operation result or rejects with response
 *
 * @example
 * ```typescript
 * // CREATE: New folder at root
 * await _upsertWorkspaceItems(token, workspaceId, [{
 *   action: WorkspaceItemAction.Create,
 *   entityType: 2,
 *   parentId: null, // ✅ null = root level
 *   folderData: { name: "My Folder", color: "#FF0000" }
 * }]);
 *
 * // MOVE: Move to different parent
 * await _upsertWorkspaceItems(token, workspaceId, [{
 *   action: WorkspaceItemAction.Move,
 *   id: 789, // ✅ workspace_items.id
 *   parentId: 45 // ✅ parent folder's ENTITY ID (entityId)
 * }]);
 *
 * // DELETE: Soft delete
 * await _upsertWorkspaceItems(token, workspaceId, [{
 *   action: WorkspaceItemAction.Delete,
 *   id: 789 // ✅ workspace_items.id
 * }]);
 * ```
 */
const _upsertWorkspaceItems = async (
    token: string,
    workspaceId: number,
    requests: UpsertWorkspaceItemRequest[]
): Promise<ResultOptions> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requests),
    };

    const res = await window.fetch(
        `${config.api.baseURL}/api/workspace/${workspaceId}/items/batch`,
        options
    );

    if (res.ok) {
        const ret = await res.json();
        return ret;
    } else {
        return Promise.reject(res);
    }
};

export const workspaceService = {
    _getAllUserWorkspaces,
    _getWorkspaceTree,
    _getWorkspaceTreeV2, // V2 with full entity data
    _getWorkspaceItem,
    _upsertWorkspaceItem,
    // _moveWorkspaceItems,
    _deleteWorkspaceItems,
    _upsertFolder,
    // _addItemToWorkspace,
    _upsertWorkspaceItems, // NEW
}