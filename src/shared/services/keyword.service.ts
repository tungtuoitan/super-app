/**
 * Keyword Service - API communication for keyword operations
 */

import { config } from "@/utils/config/app.config";
import type { Keyword, UpsertExternalKeywordRequest, KeywordSyncReport } from "@/shared/types/keyword.types";
import {ResultOptions} from "@/shared/types/resultOptions.types";
import {apiFetch} from "./apiClient";

const _getKeywords = async (
    _token: string,
    params?: {
        workspaceIds?: string;
    },
) => {
    const queryParams = new URLSearchParams();
    if (params?.workspaceIds) queryParams.append("workspaceIds", params.workspaceIds);

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/keyword?${queryString}`
        : `${config.api.baseURL}/api/keyword`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as Keyword[];
    return Promise.reject(res);
};

const _upsertExternalKeywords = async (
    _token: string,
    requests: UpsertExternalKeywordRequest[],
) => {
    const res = await apiFetch(`${config.api.baseURL}/api/keyword/external/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

const _syncKeywords = async (_token: string): Promise<KeywordSyncReport> => {
    const res = await apiFetch(`${config.api.baseURL}/api/keyword/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return (await res.json()) as KeywordSyncReport;
    return Promise.reject(res);
};

export const keywordService = {
    _getKeywords,
    _upsertExternalKeywords,
    _syncKeywords,
};
