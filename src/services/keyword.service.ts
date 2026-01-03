/**
 * Keyword Service - API communication for keyword operations
 * Pattern: Similar to note.service.ts - uses native fetch API
 */

import { config } from "@/config/app.config";
import type { ResultOptions } from "@/types/common.types";
import type { Keyword, UpsertExternalKeywordRequest } from "@/types/keyword.types";

/**
 * Get all keywords with optional workspace filtering
 * GET /api/keyword?workspaceIds=1,2,3
 *
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of keywords or rejects with response
 */
const _getKeywords = async (
    token: string,
    params?: {
        workspaceIds?: string; // Comma-separated workspace IDs: "1,2,3"
    },
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.workspaceIds) {
        queryParams.append("workspaceIds", params.workspaceIds);
    }

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/keyword?${queryString}`
        : `${config.api.baseURL}/api/keyword`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        const result = (await res.json()) as Keyword[];
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Batch upsert external keywords
 * POST /api/keyword/external/batch
 *
 * @param token - Authentication token
 * @param requests - Array of external keyword upsert data
 * @returns Batch operation results or rejects with response
 */
const _upsertExternalKeywords = async (
    token: string,
    requests: UpsertExternalKeywordRequest[],
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requests),
    };

    const res = await window.fetch(
        `${config.api.baseURL}/api/keyword/external/batch`,
        options
    );

    if (res.ok) {
        const result = (await res.json()) as ResultOptions;
        return result;
    } else {
        return Promise.reject(res);
    }
};

export const keywordService = {
    _getKeywords,
    _upsertExternalKeywords,
};
