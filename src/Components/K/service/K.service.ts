/**
 * KWorkspace Service — API communication for kworkspace operations
 *
 * Endpoints (KWorkspaceController):
 *   GET    /api/kworkspace                        — list all workspaces
 *   GET    /api/kworkspace/{id}/tree/v2           — get workspace tree (flat nodes)
 *   POST   /api/kworkspace/{id}/items/batch       — batch upsert nodes (create/update/move/delete/restore)
 *   PATCH  /api/kworkspace/{id}/items/move        — move nodes (stored proc)
 *   DELETE /api/kworkspace/{id}/items             — delete nodes
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { KMoveItemsRequest, KDeleteItemsRequest, KOperationResult, KWsResponse, KUpsertWorkspaceItemRequest } from "../types/K.types";
import { ResultOptions } from "../../../types";
import type { KDTO } from "../types/K-dto.types";

// ── Get all workspaces ──────────────────────────────────────────────────────

const _getAllUserWorkspaces = async (_token: string): Promise<KWsResponse[]> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Get workspace tree (flat nodes) ────────────────────────────────────────

const _getWorkspaceTreeV2 = async (
    _token: string,
    workspaceId: number,
): Promise<ResultOptions<KDTO>> => {
    const url = `${config.api.baseURL}/api/kworkspace/${workspaceId}/tree/v2`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<KDTO>;
    return Promise.reject(res);
};

// ── Batch upsert nodes (create / update / move / movecross / delete / restore) ──

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

// ── Move nodes (stored proc, same or cross workspace) ──────────────────────

// const _moveItems = async (
//     _token: string,
//     workspaceId: number,
//     data: KMoveItemsRequest
// ): Promise<ResultOptions> => {
//     const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/items/move`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//     });

//     if (res.ok) return await res.json();
//     return Promise.reject(res);
// };

// ── Delete nodes ────────────────────────────────────────────────────────────

const _deleteWorkspaceItems = async (
    _token: string,
    workspaceId: number,
    data: KDeleteItemsRequest
): Promise<KOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/kworkspace/${workspaceId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Export ──────────────────────────────────────────────────────────────────

export const KService = {
    _getAllUserWorkspaces,
    _getWorkspaceTreeV2,
    _upsertWorkspaceItems,
    // _moveItems,
    _deleteWorkspaceItems,
};
