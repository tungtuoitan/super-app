/**
 * Workspace Service - API communication for workspace operations
 */

import { config } from "config/app.config";
import type { DeleteItemsRequest, WorkspaceOperationResult, WsResponse, UpsertWorkspaceItemRequest } from "../types/workspace.types";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import type { ResultOptions } from "@/shared";
import { apiFetch } from "@/shared";

const _getAllUserWorkspaces = async (_token: string): Promise<WsResponse[]> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace`, {
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

const _deleteWorkspaceItems = async (_token: string, workspaceId: number, data: DeleteItemsRequest): Promise<WorkspaceOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/workspace/${workspaceId}/items`, {
        method: "DELETE",
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
    _getWorkspaceTreeV2,
    _deleteWorkspaceItems,
    _upsertWorkspaceItems,
};
