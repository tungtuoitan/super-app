/**
 * Task Service - API communication for task operations
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import { ResultOptions } from "../types";
import type { TaskDTO } from "@/types/task/task.types";

// Re-export for backward compatibility
export type { TaskDTO } from "@/types/task/task.types";

const _getTasks = async (
    _token: string,
    params?: {
        projectIds?: string;
        status?: string;
        priority?: string;
        deletedAt?: string;
    }
): Promise<ResultOptions<TaskDTO>> => {
    const queryParams = new URLSearchParams();
    if (params?.projectIds) queryParams.append("projectIds", params.projectIds);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.priority) queryParams.append("priority", params.priority);
    if (params?.deletedAt) queryParams.append("deletedAt", params.deletedAt);

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/task?${queryString}`
        : `${config.api.baseURL}/api/task`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<TaskDTO>;
    return Promise.reject(res);
};

const _upsertTaskBatch = async (
    _token: string,
    requests: Array<{
        id?: number;
        projectId: number;
        parentTaskId?: number | null;
        type?: string;
        taskType?: string;
        title: string;
        note?: string | null;
        status?: string;
        priority?: string;
        startDate?: string | null;
        endDate?: string | null;
        orderIndex?: number;
        deletedAt?: string | null;
        folderWorkspaceItemId?: number | null;
        checklistJson?: string | null;
    }>
): Promise<ResultOptions<TaskDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) return (await res.json()) as ResultOptions<TaskDTO>;
    return Promise.reject(res);
};

const _getTaskById = async (_token: string, id: number): Promise<ResultOptions<TaskDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/task/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<TaskDTO>;
    return Promise.reject(res);
};

export const taskService = {
    _getTasks,
    _getTaskById,
    _upsertTaskBatch,
};
