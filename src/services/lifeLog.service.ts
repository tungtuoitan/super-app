/**
 * LifeLog Service - API communication for tracks and logs
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { LifeLogTrackDTO, LifeLogLogDTO, UpsertLifeLogTrackDTO, UpsertLifeLogLogDTO } from "@/types/lifeLog.types";

interface ResultOptions<T = unknown> {
    success: boolean;
    message?: string;
    data?: T[];
    status?: number;
}

const base = () => `${config.api.baseURL}/api/lifelog`;

// ─── Tracks ─────────────────────────────────────────────────────────────────

const _getTracks = async (
    _token: string,
    params?: { searchText?: string; deletedAt?: string; ids?: string }
) => {
    const q = new URLSearchParams();
    if (params?.searchText) q.append("searchText", params.searchText);
    if (params?.deletedAt) q.append("deletedAt", params.deletedAt);
    if (params?.ids) q.append("ids", params.ids);

    const url = q.toString() ? `${base()}/tracks?${q}` : `${base()}/tracks`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<LifeLogTrackDTO>;
    return Promise.reject(res);
};

const _upsertTracks = async (_token: string, requests: UpsertLifeLogTrackDTO[]) => {
    const res = await apiFetch(`${base()}/tracks/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) return (await res.json()) as ResultOptions<LifeLogTrackDTO>;
    return Promise.reject(res);
};

// ─── Logs ────────────────────────────────────────────────────────────────────

const _getLogs = async (
    _token: string,
    params?: {
        searchText?: string;
        type?: string;
        trackId?: number;
        createdAtFrom?: string;
        createdAtTo?: string;
        deletedAt?: string;
        ids?: string;
    }
) => {
    const q = new URLSearchParams();
    if (params?.searchText) q.append("searchText", params.searchText);
    if (params?.type) q.append("type", params.type);
    if (params?.trackId !== undefined) q.append("trackId", String(params.trackId));
    if (params?.createdAtFrom) q.append("createdAtFrom", params.createdAtFrom);
    if (params?.createdAtTo) q.append("createdAtTo", params.createdAtTo);
    if (params?.deletedAt) q.append("deletedAt", params.deletedAt);
    if (params?.ids) q.append("ids", params.ids);

    const url = q.toString() ? `${base()}/logs?${q}` : `${base()}/logs`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) {
        const json = (await res.json()) as ResultOptions<LifeLogLogDTO>;
        return json;
    }
    return Promise.reject(res);
};

const _upsertLogs = async (_token: string, requests: UpsertLifeLogLogDTO[]) => {
    const res = await apiFetch(`${base()}/logs/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) {
        const json = (await res.json()) as ResultOptions<LifeLogLogDTO>;
        return json;
    }
    return Promise.reject(res);
};

export const lifeLogService = {
    _getTracks,
    _upsertTracks,
    _getLogs,
    _upsertLogs,
};
