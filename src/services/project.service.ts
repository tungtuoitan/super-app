/**
 * Project Service - API communication for project operations
 * Uses native fetch API
 */

import { config } from "@/config/app.config";
import { ResultOptions } from "../types";

/**
 * Project DTO from API (dates as strings)
 */
export interface ProjectDTO {
    id: number;
    name: string;
    description?: string | null;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

/**
 * Get all projects with optional filtering
 * GET /api/project?searchText=...&status=...&deletedAt=...&ids=...
 */
const _getProjects = async (
    token: string,
    params?: {
        searchText?: string;
        status?: string; // Comma-separated status codes: "active,completed"
        deletedAt?: string; // "null" or "notNull"
        ids?: string; // Comma-separated IDs: "1,2,3"
    }
): Promise<ResultOptions<ProjectDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const queryParams = new URLSearchParams();
    if (params?.searchText) {
        queryParams.append("searchText", params.searchText);
    }
    if (params?.status) {
        queryParams.append("status", params.status);
    }
    if (params?.deletedAt) {
        queryParams.append("deletedAt", params.deletedAt);
    }
    if (params?.ids) {
        queryParams.append("ids", params.ids);
    }

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/project?${queryString}`
        : `${config.api.baseURL}/api/project`;

    const res = await window.fetch(url, {
        method: "GET",
        headers,
    });

    if (res.ok) {
        return (await res.json()) as ResultOptions<ProjectDTO>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Batch upsert multiple projects (create, update, soft delete, or restore)
 * POST /api/project
 *
 * Operations:
 * - CREATE: id = 0 or undefined
 * - UPDATE: id > 0
 * - SOFT DELETE: id > 0, deletedAt = ISO timestamp string
 * - RESTORE: id > 0, deletedAt = null
 */
const _upsertProjectBatch = async (
    token: string,
    requests: Array<{
        id?: number;
        name: string;
        description?: string | null;
        status?: string;
        startDate?: string | null;
        endDate?: string | null;
        deletedAt?: string | null;
    }>
): Promise<ResultOptions<ProjectDTO>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");

    const res = await window.fetch(`${config.api.baseURL}/api/project`, {
        method: "POST",
        headers,
        body: JSON.stringify(requests),
    });

    if (res.ok) {
        return (await res.json()) as ResultOptions<ProjectDTO>;
    } else {
        return Promise.reject(res);
    }
};

export const projectService = {
    _getProjects,
    _upsertProjectBatch,
};
