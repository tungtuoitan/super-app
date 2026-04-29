/**
 * UserProfile Service - API communication for user profile operations
 */

import { config } from "@/utils/config/app.config";
import {ResultOptions} from "@/shared";
import {UpdateUserProfileRequest} from "@/shared";
import {apiFetch} from "./apiClient";

const _getUserProfile = async (_token: string): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/userprofile`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

const _upsertUserProfile = async (_token: string, data: UpdateUserProfileRequest): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/userprofile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

export const userProfileService = {
    _getUserProfile,
    _upsertUserProfile,
};
