import { config } from "config/app.config";
import { apiFetch } from "@/shared";
import type { KRepoSyncConfig, KRepoSyncDiff, KRepoCompareDiff, KRepoResolveConflictItem } from "../types/kRepoSync.type";

const BASE = `${config.api.baseURL}/api/k/repo-sync`;

const _getStatus = async (token: string): Promise<KRepoSyncConfig> => {
    const res = await apiFetch(`${BASE}/status`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _saveConfig = async (
    token: string,
    data: { repoUrl: string; branch: string; pat: string }
): Promise<void> => {
    const res = await apiFetch(`${BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    if (!res.ok) return Promise.reject(res);
};

const _push = async (token: string): Promise<void> => {
    const res = await apiFetch(`${BASE}/push`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return Promise.reject(res);
};

const _pull = async (token: string): Promise<void> => {
    const res = await apiFetch(`${BASE}/pull`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return Promise.reject(res);
};

const _retry = async (token: string): Promise<void> => {
    const res = await apiFetch(`${BASE}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return Promise.reject(res);
};

const _forceUpdate = async (token: string): Promise<void> => {
    const res = await apiFetch(`${BASE}/force-update`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return Promise.reject(res);
};

const _getCompare = async (token: string): Promise<KRepoCompareDiff> => {
    const res = await apiFetch(`${BASE}/compare`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _resolveConflicts = async (token: string, items: KRepoResolveConflictItem[]): Promise<void> => {
    const res = await apiFetch(`${BASE}/resolve-conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
    });
    if (!res.ok) return Promise.reject(res);
};

const _getDiff = async (token: string): Promise<KRepoSyncDiff> => {
    const res = await apiFetch(`${BASE}/diff`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

export const KRepoSyncService = {
    _getStatus,
    _saveConfig,
    _push,
    _pull,
    _retry,
    _forceUpdate,
    _getDiff,
    _getCompare,
    _resolveConflicts,
};
