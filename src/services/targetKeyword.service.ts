/**
 * TargetKeyword Service - API communication for linking keywords to target entities
 * Uses native fetch API
 */

import { config } from "@/config/app.config";
import { ResultOptions } from "../types";

export interface TargetKeywordDTO {
    id: number;
    targetId: number;
    targetType: string;
    keywordId: number;
}

export type TargetKeywordTargetType = "TASK" | "NOTE" | "PROJECT" | "WORKSPACE" | "FOLDER";

/**
 * Get all keywords linked to a target entity
 */
const _getTargetKeywords = async (
    token: string,
    targetId: number,
    targetType: TargetKeywordTargetType
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);

    const res = await window.fetch(
        `${config.api.baseURL}/api/keyword/target-keywords?targetId=${targetId}&targetType=${targetType}`,
        { method: "GET", headers }
    );

    if (res.ok) {
        return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Link a keyword to a target entity
 */
const _linkTargetKeyword = async (
    token: string,
    data: { targetId: number; targetType: TargetKeywordTargetType; keywordId: number }
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const res = await window.fetch(
        `${config.api.baseURL}/api/keyword/target-keywords`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        }
    );

    if (res.ok) {
        return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Unlink a keyword from a target entity
 */
const _unlinkTargetKeyword = async (
    token: string,
    id: number
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);

    const res = await window.fetch(
        `${config.api.baseURL}/api/keyword/target-keywords/${id}`,
        { method: "DELETE", headers }
    );

    if (res.ok) {
        return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    } else {
        return Promise.reject(res);
    }
};

export const targetKeywordService = {
    _getTargetKeywords,
    _linkTargetKeyword,
    _unlinkTargetKeyword,
};
