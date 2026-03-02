/**
 * TaskWorkspaceItem Service - API communication for task-workspace item links
 * Uses native fetch API
 */

import { config } from "@/config/app.config";
import { ResultOptions } from "../types";

export interface TaskWorkspaceItemDTO {
    id: number;
    taskId: number;
    workspaceItemId: number;
    itemType: number; // 2 = Folder, 3 = Note
}

/**
 * Get all workspace items linked to a task
 */
const _getTaskWorkspaceItems = async (
    token: string,
    taskId: number
): Promise<ResultOptions<TaskWorkspaceItemDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const res = await window.fetch(
        `${config.api.baseURL}/api/task/${taskId}/workspace-items`,
        { method: "GET", headers }
    );

    if (res.ok) {
        return (await res.json()) as ResultOptions<TaskWorkspaceItemDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Link a workspace item to a task
 */
const _linkTaskWorkspaceItem = async (
    token: string,
    taskId: number,
    data: { workspaceItemId: number; itemType: number }
): Promise<ResultOptions<TaskWorkspaceItemDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const res = await window.fetch(
        `${config.api.baseURL}/api/task/${taskId}/workspace-items`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        }
    );

    if (res.ok) {
        return (await res.json()) as ResultOptions<TaskWorkspaceItemDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Unlink a workspace item from a task
 */
const _unlinkTaskWorkspaceItem = async (
    token: string,
    taskId: number,
    id: number
): Promise<ResultOptions<TaskWorkspaceItemDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const res = await window.fetch(
        `${config.api.baseURL}/api/task/${taskId}/workspace-items/${id}`,
        { method: "DELETE", headers }
    );

    if (res.ok) {
        return (await res.json()) as ResultOptions<TaskWorkspaceItemDTO>;
    } else {
        return Promise.reject(res);
    }
};

export const taskWorkspaceItemService = {
    _getTaskWorkspaceItems,
    _linkTaskWorkspaceItem,
    _unlinkTaskWorkspaceItem,
};
