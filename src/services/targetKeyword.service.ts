/**
 * TargetKeyword Service - API communication for linking keywords to target entities
 */

import { config } from "@/utils/config/app.config";
import { apiFetch } from "@/services/apiClient";
import {ResultOptions} from "@/shared/types/resultOptions.types";

export interface TargetKeywordDTO {
    id: number;
    targetId: number;
    targetType: string;
    keywordId: number;
}

export type TargetKeywordTargetType = "TASK" | "NOTE" | "PROJECT" | "WORKSPACE" | "FOLDER";

const _getTargetKeywords = async (
    _token: string,
    targetId: number,
    targetType: TargetKeywordTargetType
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/keyword/target-keywords?targetId=${targetId}&targetType=${targetType}`,
        { method: "GET" }
    );

    if (res.ok) return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    return Promise.reject(res);
};

const _linkTargetKeyword = async (
    _token: string,
    data: { targetId: number; targetType: TargetKeywordTargetType; keywordId: number }
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/keyword/target-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    return Promise.reject(res);
};

const _unlinkTargetKeyword = async (
    _token: string,
    id: number
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/keyword/target-keywords/${id}`,
        { method: "DELETE" }
    );

    if (res.ok) return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    return Promise.reject(res);
};

const _getKeywordTargets = async (
    _token: string,
    keywordId: number
): Promise<ResultOptions<TargetKeywordDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/keyword/keyword-targets?keywordId=${keywordId}`,
        { method: "GET" }
    );

    if (res.ok) return (await res.json()) as ResultOptions<TargetKeywordDTO>;
    return Promise.reject(res);
};

export const targetKeywordService = {
    _getTargetKeywords,
    _getKeywordTargets,
    _linkTargetKeyword,
    _unlinkTargetKeyword,
};
