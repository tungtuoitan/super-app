/**
 * Keyword Service - API communication for keyword operations
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { ResultOptions } from "@/types/common.types";
import type { Keyword, UpsertExternalKeywordRequest } from "@/types/keyword.types";

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

export const keywordService = {
    _getKeywords,
    _upsertExternalKeywords,
};
