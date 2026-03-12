/**
 * KWorkspace Service - API communication for kworkspace operations
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { KMoveItemsRequest, KDeleteItemsRequest, KOperationResult, KWsResponse, KUpsertWorkspaceItemRequest } from "../types/K.types";
import type { KWithTreeResponseV2 } from "../types/K-v2.types";
import _ from "lodash";
import { ResultOptions } from "../../../types";
import type { KDTO } from "../types/K-dto.types";
import {kconstants} from "../utils/K.Constants";

export interface KUpsertFolderRequest {
    id?: number | null;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: number | null;
}

const _getAllUserWorkspaces = async (_token: string): Promise<KWsResponse[]> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _getWorkspaceTree = async (_token: string, workspaceId: number): Promise<KWithTreeResponseV2> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/tree`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

export interface KTreeParams {
    statusCode?: string;
    deletedAt?: string;
}

const _getWorkspaceTreeV2 = async (
    _token: string,
    workspaceId: number,
    params?: KTreeParams
): Promise<ResultOptions<KDTO>> => {
    const queryParams = new URLSearchParams();
    if (params?.statusCode) queryParams.append("statusCode", params.statusCode);
    if (params?.deletedAt) queryParams.append("deletedAt", params.deletedAt);

    const queryString = queryParams.toString();
    const url = `${config.api.baseURL}/api/kworkspace/${workspaceId}/tree/v2${queryString ? `?${queryString}` : ""}`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<KDTO>;
    return Promise.reject(res);
};

const _getWorkspaceItem = async (_token: string, workspaceId: number, itemId: number) => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/items/${itemId}`, {
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
        childType?: typeof kconstants.workspace.itemTypes.note | typeof kconstants.workspace.itemTypes.folder;
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
        ? `${config.api.baseURL}/api/kworkspace/${workspaceId}/items/${itemId}`
        : `${config.api.baseURL}/api/kworkspace/${workspaceId}/items`;

    const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _deleteWorkspaceItems = async (_token: string, workspaceId: number, data: KDeleteItemsRequest): Promise<KOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

const _upsertFolder = async (_token: string, workspaceId: number, data: KUpsertFolderRequest): Promise<KOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/folders`, {
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
    requests: KUpsertWorkspaceItemRequest[]
): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/items/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

export const KService = {
    _getAllUserWorkspaces,
    _getWorkspaceTree,
    _getWorkspaceTreeV2,
    _getWorkspaceItem,
    _upsertWorkspaceItem,
    _deleteWorkspaceItems,
    _upsertFolder,
    _upsertWorkspaceItems,
};
