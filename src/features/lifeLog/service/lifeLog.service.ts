/**
 * LifeLog Service - API communication for tracks and logs
 */

import { config } from "@/utils/config/app.config";
import type { LifeLogTrackDTO, LifeLogLogDTO, UpsertLifeLogTrackDTO, UpsertLifeLogLogDTO } from "@/features/lifeLog/types/lifeLog.types";
import { debugLog } from "@/shell/hooks/useDebugLog";
import {ResultOptions} from "@/shared/types/resultOptions.types";
import {apiFetch} from "@/shared/index";



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
    debugLog.log("lifelog", "upsertTracks:request", {
        count: requests.length,
        tracks: requests.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, color: r.color, isSensitive: r.isSensitive, deletedAt: r.deletedAt ?? null })),
    });
    const res = await apiFetch(`${base()}/tracks/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) {
        const json = (await res.json()) as ResultOptions<LifeLogTrackDTO>;
        debugLog.log("lifelog", "upsertTracks:response", {
            success: json.success,
            message: json.message,
            count: json.data?.length ?? 0,
            ids: json.data?.map((t) => t.id),
        });
        await debugLog.flush();
        return json;
    }
    const errText = await res.text().catch(() => "");
    debugLog.log("lifelog", "upsertTracks:error", { status: res.status, statusText: res.statusText, body: errText });
    await debugLog.flush();
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
    debugLog.log("lifelog", "upsertLogs:request", {
        count: requests.length,
        logs: requests.map(r => ({ id: r.id, type: r.type, trackId: r.trackId ?? null, title: r.title ?? null, isSensitive: r.isSensitive, occurAt: r.occurAt ?? null, deletedAt: r.deletedAt ?? null })),
    });
    const res = await apiFetch(`${base()}/logs/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) {
        const json = (await res.json()) as ResultOptions<LifeLogLogDTO>;
        debugLog.log("lifelog", "upsertLogs:response", {
            success: json.success,
            message: json.message,
            count: json.data?.length ?? 0,
            ids: json.data?.map((l) => l.id),
        });
        await debugLog.flush();
        return json;
    }
    const errText = await res.text().catch(() => "");
    debugLog.log("lifelog", "upsertLogs:error", { status: res.status, statusText: res.statusText, body: errText });
    await debugLog.flush();
    return Promise.reject(res);
};

const _getTrackById = async (_token: string, id: number) => {
    const res = await apiFetch(`${base()}/tracks/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<LifeLogTrackDTO>;
    return Promise.reject(res);
};

const _getLogById = async (_token: string, id: number) => {
    const res = await apiFetch(`${base()}/logs/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<LifeLogLogDTO>;
    return Promise.reject(res);
};

export const lifeLogService = {
    _getTracks,
    _getTrackById,
    _upsertTracks,
    _getLogs,
    _getLogById,
    _upsertLogs,
};
