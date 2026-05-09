/**
 * Task Service - API communication for task operations
 */

import { config } from "config/app.config";
import type { TaskDTO } from "../types/task.types";
import { useDebugLog } from "@/shared";
import {ResultOptions} from "@/shared";
import {apiFetch} from "@/shared";

export interface ProjectOptionDTO {
    id: number;
    name: string;
    status: string;
    deletedAt?: string | null;
    workspaceId?: number | null;
}

// Re-export for backward compatibility
export type { TaskDTO } from "../types/task.types";

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
        processJson?: string | null;
        customTabsJson?: string | null;
    }>
): Promise<ResultOptions<TaskDTO>> => {
    // ── Debug: log every upsert request with folderWorkspaceItemId ──
    const debugLog = useDebugLog();
    for (const req of requests) {
        debugLog.log("task-upsert", "service-upsertTaskBatch", {
            id: req.id,
            title: req.title,
            folderWorkspaceItemId: req.folderWorkspaceItemId,
            folderWorkspaceItemId_isUndefined: req.folderWorkspaceItemId === undefined,
            folderWorkspaceItemId_isNull: req.folderWorkspaceItemId === null,
            caller: new Error().stack?.split("\n")[2]?.trim(),
        });
    }

    const res = await apiFetch(`${config.api.baseURL}/api/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) {
        const result = (await res.json()) as ResultOptions<TaskDTO>;
        // ── Debug: log response folderWorkspaceItemId ──
        if (result.data) {
            for (const dto of result.data) {
                debugLog.log("task-upsert", "service-upsertTaskBatch-response", {
                    id: dto.id,
                    title: dto.title,
                    folderWorkspaceItemId: dto.folderWorkspaceItemId,
                });
            }
        }
        debugLog.flush();
        return result;
    }
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

/**
 * Partial update a single task — only non-null fields are updated in DB.
 * Use for section saves (process, checklist, custom tabs) to avoid overwriting other fields.
 */
const _patchTask = async (
    _token: string,
    taskId: number,
    patch: {
        note?: string;
        checklistJson?: string;
        processJson?: string;
        customTabsJson?: string;
        status?: string;
    }
): Promise<ResultOptions<TaskDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/task/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    if (res.ok) return (await res.json()) as ResultOptions<TaskDTO>;
    return Promise.reject(res);
};

const _deleteTaskBatch = async (
    _token: string,
    taskIds: number[],
): Promise<ResultOptions<void>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/task`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: taskIds }),
    });
    if (res.ok) return (await res.json()) as ResultOptions<void>;
    return Promise.reject(res);
};

const _getProjects = async (
    _token: string,
    params?: { deletedAt?: string; status?: string; searchText?: string }
): Promise<ResultOptions<ProjectOptionDTO>> => {
    const queryParams = new URLSearchParams();
    if (params?.deletedAt) queryParams.append("deletedAt", params.deletedAt);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.searchText) queryParams.append("searchText", params.searchText);
    const qs = queryParams.toString();
    const url = qs ? `${config.api.baseURL}/api/project?${qs}` : `${config.api.baseURL}/api/project`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<ProjectOptionDTO>;
    return Promise.reject(res);
};

export const taskService = {
    _getTasks,
    _getTaskById,
    _upsertTaskBatch,
    _patchTask,
    _deleteTaskBatch,
    _getProjects,
};
