/**
 * Standard Registry Service - API communication for standard registry operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "@/config/app.config";
import type { ResultOptions, StandardRegistryDTO } from "@/types/standardRegistry.types";

/**
 * Get all standard registry entries with optional type filtering
 * GET /api/StandardRegistry/getStandardRegistryByType
 *
 * @param token - Authentication token
 * @param params - Optional query parameters for filtering
 * @returns Array of standard registry entries or rejects with response
 */
const _getStandardRegistries = async (
    token: string,
    params?: {
        type?: string; // Optional - filter by type. If not provided, returns all registries
        showAll?: boolean; // Include inactive items
    }
) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.type) {
        queryParams.append("type", params.type);
    }
    if (params?.showAll !== undefined) {
        queryParams.append("showAll", String(params.showAll));
    }

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/StandardRegistry/getStandardRegistryByType?${queryString}`
        : `${config.api.baseURL}/api/StandardRegistry/getStandardRegistryByType`;

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(url, options);

    if (res.ok) {
        // Backend returns array directly (not wrapped in ResultOptions)
        const data = (await res.json()) as StandardRegistryDTO[];
        return {
            success: true,
            data: data,
        } as ResultOptions<StandardRegistryDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Public API exports
 */
export const standardRegistryService = {
    _getStandardRegistries,
};
