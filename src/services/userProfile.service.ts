/**
 * UserProfile Service - API communication for user profile operations
 * Uses native fetch API without TanStack Query
 */

import { config } from "@/config/app.config";
import type { UpdateUserProfileRequest, ResultOptions } from "@/types/common.types";

/**
 * Get user profile (includes filters)
 * GET /api/userprofile
 *
 * @param token - Authentication token
 * @returns ResultOptions with UserProfile in object field
 */
const _getUserProfile = async (token: string): Promise<ResultOptions> => {
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
        const result: ResultOptions = await res.json();
        return result;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Update/Upsert user profile
 * PUT /api/userprofile
 *
 * Partial update: Only provided fields will be updated, null/undefined fields are ignored
 * If profile doesn't exist, it will be created
 *
 * @param token - Authentication token
 * @param data - User profile data to update (all fields optional)
 * @returns ResultOptions with updated UserProfile in object field
 */
const _upsertUserProfile = async (token: string, data: UpdateUserProfileRequest): Promise<ResultOptions> => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(data),
    };

    const res = await window.fetch(`${config.api.baseURL}/api/userprofile`, options);

    if (res.ok) {
        const result: ResultOptions = await res.json();
        return result;
    } else {
        return Promise.reject(res);
    }
};

export const userProfileService = {
    _getUserProfile,
    _upsertUserProfile,
};
