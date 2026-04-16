/**
 * K Service — API communication for k knowledge/node operations
 *
 * Endpoints (KController):
 *   GET    /api/k                              — list all knowledge bases
 *   GET    /api/k/{knowledgeId}/tree           — get knowledge tree (flat nodes)
 *   POST   /api/k/{knowledgeId}/nodes/batch    — batch upsert nodes (create/update/move/delete/restore)
 *   DELETE /api/k/{knowledgeId}/nodes          — delete nodes (and descendants)
 */

import { config } from "@/utils/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { KDeleteItemsRequest, KOperationResult, KWsResponse, KUpsertWorkspaceItemRequest } from "../types/K.types";
import { ResultOptions } from "../../../types";
import type { KDTO } from "../types/K-dto.types";
import type { KImportTestMarkdownRequest } from "../types/kMarkdownImport.type";

// ── Get all knowledge bases ──────────────────────────────────────────────────

const _getAllUserWorkspaces = async (_token: string): Promise<KWsResponse[]> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Create knowledge ─────────────────────────────────────────────────────────

const _createKnowledge = async (
    _token: string,
    data: { name: string; description?: string; imageBase64?: string }
): Promise<ResultOptions<KWsResponse>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Update knowledge ──────────────────────────────────────────────────────────

const _updateKnowledge = async (
    _token: string,
    id: number,
    data: { name: string; description?: string; imageBase64?: string }
): Promise<ResultOptions<KWsResponse>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Soft delete knowledge ─────────────────────────────────────────────────────

const _softDeleteKnowledge = async (_token: string, id: number): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Get knowledge tree (flat nodes) ─────────────────────────────────────────

const _getWorkspaceTreeV2 = async (
    _token: string,
    knowledgeId: number,
): Promise<ResultOptions<KDTO>> => {
    const url = `${config.api.baseURL}/api/k/${knowledgeId}/tree`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<KDTO>;
    return Promise.reject(res);
};

// ── Batch upsert nodes (create / update / move / movecross / delete / restore) ──

const _upsertWorkspaceItems = async (
    _token: string,
    knowledgeId: number,
    requests: KUpsertWorkspaceItemRequest[]
): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/${knowledgeId}/nodes/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests.map((r) => ({
            ...r,
            parentId: (r.parentId != null && r.parentId <= 0) ? null : r.parentId,
        }))),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Delete nodes ─────────────────────────────────────────────────────────────

const _deleteWorkspaceItems = async (
    _token: string,
    knowledgeId: number,
    data: KDeleteItemsRequest
): Promise<KOperationResult> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/${knowledgeId}/nodes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Import nodes from Markdown (AI-powered) ──────────────────────────────────

const _importMarkdown = async (
    _token: string,
    knowledgeId: number,
    markdown: string,
    parentNodeId: number | null,
): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/${knowledgeId}/nodes/import-markdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, parentNodeId }),
    });
    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Import tests from structured markdown ─────────────────────────────────────

const _importTestMarkdown = async (
    _token: string,
    knowledgeId: number,
    request: KImportTestMarkdownRequest,
): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/${knowledgeId}/import-test-markdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return await res.json();
    return Promise.reject(res);
};

// ── Export ───────────────────────────────────────────────────────────────────

export const KService = {
    _getAllUserWorkspaces,
    _createKnowledge,
    _updateKnowledge,
    _softDeleteKnowledge,
    _getWorkspaceTreeV2,
    _upsertWorkspaceItems,
    _deleteWorkspaceItems,
    _importMarkdown,
    _importTestMarkdown,
};
