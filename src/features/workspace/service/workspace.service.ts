/**
 * Workspace Service - API communication for workspace operations
 */

import { config } from "config/app.config";
import type { MoveItemsRequest, DeleteItemsRequest, WorkspaceOperationResult, WorkspaceWithTreeResponse, WsResponse, UpsertWorkspaceItemRequest } from "../types/workspace.types";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import _ from "lodash";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import type { ResultOptions } from "@/shared";
import { apiFetch } from "@/shared";

export interface UpsertFolderRequest {
    id?: number | null;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: number | null;
}

const _getAllUserWorkspaces = async (_token: string): Promise<WsResponse[]> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _getWorkspaceTree = async (_token: string, workspaceId: number): Promise<WorkspaceWithTreeResponse> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace/${workspaceId}/tree`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

export interface WorkspaceTreeParams {
    statusCode?: string;
    deletedAt?: string;
}

const _getWorkspaceTreeV2 = async (
    _token: string,
    workspaceId: number,
    params?: WorkspaceTreeParams
): Promise<ResultOptions<WorkspaceDTO>> => {
    const queryParams = new URLSearchParams();
    if (params?.statusCode) queryParams.append("statusCode", params.statusCode);
    if (params?.deletedAt) queryParams.append("deletedAt", params.deletedAt);

    const queryString = queryParams.toString();
    const url = `${config.api.baseURL}/api/workspace/${workspaceId}/tree/v2${queryString ? `?${queryString}` : ""}`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<WorkspaceDTO>;
    return Promise.reject(res);
};

const _getWorkspaceItem = async (_token: string, workspaceId: number, itemId: number) => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items/${itemId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _upsertWorkspaceItem = async (
    _token: string,
    workspaceId: number,
    data: {
        parentTagId?: number | null;
        childType?: typeof workspaceConstants.itemTypes.note | typeof workspaceConstants.itemTypes.folder;
        childId?: number;
        label?: string;
        notes?: string;
        color?: string;
        icon?: string;
        sortOrder?: number;
    },
    itemId?: number | null,
) => {
    const isUpdate = itemId !== null && itemId !== undefined;
    const method = isUpdate ? "PUT" : "POST";
    const url = isUpdate
        ? `${config.api.baseURL}/api/workspace/${workspaceId}/items/${itemId}`
        : `${config.api.baseURL}/api/workspace/${workspaceId}/items`;

    const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _deleteWorkspaceItems = async (_token: string, workspaceId: number, data: DeleteItemsRequest): Promise<WorkspaceOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _upsertFolder = async (_token: string, workspaceId: number, data: UpsertFolderRequest): Promise<WorkspaceOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace/${workspaceId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _upsertWorkspaceItems = async (
    _token: string,
    workspaceId: number,
    requests: UpsertWorkspaceItemRequest[]
): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

export const workspaceService = {
    _getAllUserWorkspaces,
    _getWorkspaceTree,
    _getWorkspaceTreeV2,
    _getWorkspaceItem,
    _upsertWorkspaceItem,
    _deleteWorkspaceItems,
    _upsertFolder,
    _upsertWorkspaceItems,
};
