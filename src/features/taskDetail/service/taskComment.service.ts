/**
 * Task Comment Service — API communication for task comment operations
 */

import { config } from "@/utils/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { TaskCommentDTO } from "../types/taskComment.types";
import {ResultOptions} from "@/shared/types/resultOptions.types";

const _getCommentsByTaskId = async (
    _token: string,
    taskId: number
): Promise<ResultOptions<TaskCommentDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/taskcomment?taskId=${taskId}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    if (res.ok) return (await res.json()) as ResultOptions<TaskCommentDTO>;
    return Promise.reject(res);
};

const _upsertComment = async (
    _token: string,
    request: {
        id?: number;
        taskId: number;
        parentCommentId?: number | null;
        content: string;
    }
): Promise<ResultOptions<TaskCommentDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/taskcomment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return (await res.json()) as ResultOptions<TaskCommentDTO>;
    return Promise.reject(res);
};

const _deleteComment = async (
    _token: string,
    commentId: number
): Promise<ResultOptions<TaskCommentDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/taskcomment/${commentId}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
    );
    if (res.ok) return (await res.json()) as ResultOptions<TaskCommentDTO>;
    return Promise.reject(res);
};

export const taskCommentService = {
    _getCommentsByTaskId,
    _upsertComment,
    _deleteComment,
};
