import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { KnowledgeDTO, KnowledgeCardDTO, UpsertKnowledgeDTO, UpsertKnowledgeCardDTO } from "@/types/knowledgeTree.types";

interface ResultOptions<T = unknown> {
    success: boolean;
    message?: string;
    data?: T[];
    status?: number;
}

const base = () => `${config.api.baseURL}/api/kt`;

// ─── Knowledge ───────────────────────────────────────────────────────────────

const _getKnowledges = async (params?: { searchText?: string; parentId?: number; rootsOnly?: boolean; deletedAt?: string }) => {
    const q = new URLSearchParams();
    if (params?.searchText) q.append("searchText", params.searchText);
    if (params?.parentId !== undefined) q.append("parentId", String(params.parentId));
    if (params?.rootsOnly) q.append("rootsOnly", "true");
    if (params?.deletedAt) q.append("deletedAt", params.deletedAt);

    const url = `${base()}/knowledges${q.toString() ? `?${q}` : ""}`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<KnowledgeDTO>;
    return Promise.reject(res);
};

const _upsertKnowledges = async (requests: UpsertKnowledgeDTO[]) => {
    const res = await apiFetch(`${base()}/knowledges/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) return (await res.json()) as ResultOptions<KnowledgeDTO>;
    return Promise.reject(res);
};

// ─── Cards ───────────────────────────────────────────────────────────────────

const _getCards = async (params?: { knowledgeId?: number; searchText?: string; deletedAt?: string }) => {
    const q = new URLSearchParams();
    if (params?.knowledgeId !== undefined) q.append("knowledgeId", String(params.knowledgeId));
    if (params?.searchText) q.append("searchText", params.searchText);
    if (params?.deletedAt) q.append("deletedAt", params.deletedAt);

    const url = `${base()}/cards${q.toString() ? `?${q}` : ""}`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<KnowledgeCardDTO>;
    return Promise.reject(res);
};

const _upsertCards = async (requests: UpsertKnowledgeCardDTO[]) => {
    const res = await apiFetch(`${base()}/cards/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) return (await res.json()) as ResultOptions<KnowledgeCardDTO>;
    return Promise.reject(res);
};

export const ktService = {
    _getKnowledges,
    _upsertKnowledges,
    _getCards,
    _upsertCards,
};
