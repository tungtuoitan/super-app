/**
 * UserProfile Service - API communication for user profile operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "@/config/app.config";
import type { UserFilters } from "@/types/common.types";

/**
 * Get user profile (includes filters)
 * GET /api/userprofile
 *
 * @param token - Authentication token
 * @returns User profile with filters or rejects with response
 */
const _getUserProfile = async (token: string) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "GET",
        headers: headers,
    };

    const res = await window.fetch(`${config.api.baseURL}/api/userprofile`, options);

    if (res.ok) {
        const result = await res.json();
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Update user filter preferences
 * PATCH /api/userprofile/filters
 *
 * @param token - Authentication token
 * @param filters - User filter preferences object
 * @returns Updated user profile or rejects with response
 */
const _updateFilters = async (token: string, filters: UserFilters) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const filtersJson = JSON.stringify(filters);

    const options = {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ filters: filtersJson }),
    };

    const res = await window.fetch(`${config.api.baseURL}/api/userprofile/filters`, options);

    if (res.ok) {
        const result = await res.json();
        return result;
    } else {
        return Promise.reject(res);
    }
};

export const userProfileService = {
    _getUserProfile,
    _updateFilters,
};
