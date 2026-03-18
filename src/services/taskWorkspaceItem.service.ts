/**
 * TaskWorkspaceItem Service - API communication for task-workspace item links
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import { ResultOptions } from "../types";
import type { TaskWorkspaceItemDTO } from "@/types/task/taskDetail.types";

// Re-export for backward compatibility
export type { TaskWorkspaceItemDTO } from "@/types/task/taskDetail.types";

const _getTaskWorkspaceItems = async (
    _token: string,
    taskId: number
): Promise<ResultOptions<TaskWorkspaceItemDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/task/${taskId}/workspace-items`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (res.ok) return (await res.json()) as ResultOptions<TaskWorkspaceItemDTO>;
    return Promise.reject(res);
};

const _linkTaskWorkspaceItem = async (
    _token: string,
    taskId: number,
    data: { workspaceItemId: number; itemType: number }
): Promise<ResultOptions<TaskWorkspaceItemDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/task/${taskId}/workspace-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) return (await res.json()) as ResultOptions<TaskWorkspaceItemDTO>;
    return Promise.reject(res);
};

const _unlinkTaskWorkspaceItem = async (
    _token: string,
    taskId: number,
    id: number
): Promise<ResultOptions<TaskWorkspaceItemDTO>> => {
    const res = await apiFetch(
        `${config.api.baseURL}/api/task/${taskId}/workspace-items/${id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
    );

    if (res.ok) return (await res.json()) as ResultOptions<TaskWorkspaceItemDTO>;
    return Promise.reject(res);
};

export const taskWorkspaceItemService = {
    _getTaskWorkspaceItems,
    _linkTaskWorkspaceItem,
    _unlinkTaskWorkspaceItem,
};
