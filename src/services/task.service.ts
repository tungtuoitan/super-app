/**
 * Task Service - API communication for task operations
 * Uses native fetch API
 */

import { config } from "@/config/app.config";
import { ResultOptions } from "../types";

/**
 * Task DTO from API (dates as strings)
 */
export interface TaskDTO {
    id: number;
    projectId: number;
    parentTaskId?: number | null;
    type: string;
    title: string;
    note?: string | null;
    status: string;
    priority: string;
    startDate?: string | null;
    endDate?: string | null;
    orderIndex: number;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;

    // Workspace folder linked to this task
    folderWorkspaceItemId?: number | null;

    // Limit dates from backend for warning display
    projectStartDate?: string | null;
    projectEndDate?: string | null;
    parentStartDate?: string | null; // Only present if task is a subtask
    parentEndDate?: string | null;
}

/**
 * Get tasks with optional filtering by project IDs
 * GET /api/task?projectIds=1,2,3
 */
const _getTasks = async (
    token: string,
    params?: {
        projectIds?: string; // Comma-separated IDs: "1,2,3"
        status?: string;
        priority?: string;
        deletedAt?: string; // "null" or "notNull"
    }
): Promise<ResultOptions<TaskDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const queryParams = new URLSearchParams();
    if (params?.projectIds) {
        queryParams.append("projectIds", params.projectIds);
    }
    if (params?.status) {
        queryParams.append("status", params.status);
    }
    if (params?.priority) {
        queryParams.append("priority", params.priority);
    }
    if (params?.deletedAt) {
        queryParams.append("deletedAt", params.deletedAt);
    }

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/task?${queryString}`
        : `${config.api.baseURL}/api/task`;

    const res = await window.fetch(url, {
        method: "GET",
        headers,
    });

    if (res.ok) {
        return (await res.json()) as ResultOptions<TaskDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Batch upsert multiple tasks (create, update, soft delete, or restore)
 * POST /api/task
 *
 * Operations:
 * - CREATE: id = 0 or undefined
 * - UPDATE: id > 0
 * - SOFT DELETE: id > 0, deletedAt = ISO timestamp string
 * - RESTORE: id > 0, deletedAt = null
 */
const _upsertTaskBatch = async (
    token: string,
    requests: Array<{
        id?: number;
        projectId: number;
        parentTaskId?: number | null;
        type?: string;
        title: string;
        note?: string | null;
        status?: string;
        priority?: string;
        startDate?: string | null;
        endDate?: string | null;
        orderIndex?: number;
        deletedAt?: string | null;
        folderWorkspaceItemId?: number | null;
    }>
): Promise<ResultOptions<TaskDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const res = await window.fetch(`${config.api.baseURL}/api/task`, {
        method: "POST",
        headers,
        body: JSON.stringify(requests),
    });

    if (res.ok) {
        return (await res.json()) as ResultOptions<TaskDTO>;
    } else {
        return Promise.reject(res);
    }
};

export const taskService = {
    _getTasks,
    _upsertTaskBatch,
};
