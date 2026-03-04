/**
 * Standard Registry Service - API communication for standard registry operations
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { ResultOptions } from "@/types/common.types";
import type { StandardRegistryDTO } from "@/types/standardRegistry.types";

const _getStandardRegistries = async (
    _token: string,
    params?: {
        type?: string;
        showAll?: boolean;
    }
) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.showAll !== undefined) queryParams.append("showAll", String(params.showAll));

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/StandardRegistry/getStandardRegistryByType?${queryString}`
        : `${config.api.baseURL}/api/StandardRegistry/getStandardRegistryByType`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) {
        // Backend returns array directly (not wrapped in ResultOptions)
        const data = (await res.json()) as StandardRegistryDTO[];
        return { success: true, data } as ResultOptions<StandardRegistryDTO>;
    }
    return Promise.reject(res);
};

export const standardRegistryService = {
    _getStandardRegistries,
};
