/**
 * Project Service - API communication for project operations
 */

import { config } from "config/app.config";
import {ResultOptions} from "@/shared";
import {apiFetch} from "@/shared";

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
    workspaceId?: number | null;
    image?: string | null;
}

const getProjects = async (
    _token: string,
    params?: {
        searchText?: string;
        status?: string;
        deletedAt?: string;
        ids?: string;
    }
): Promise<ResultOptions<ProjectDTO>> => {
    const queryParams = new URLSearchParams();
    if (params?.searchText) queryParams.append("searchText", params.searchText);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.deletedAt) queryParams.append("deletedAt", params.deletedAt);
    if (params?.ids) queryParams.append("ids", params.ids);

    const queryString = queryParams.toString();
    const url = queryString
        ? `${config.api.baseURL}/api/project?${queryString}`
        : `${config.api.baseURL}/api/project`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<ProjectDTO>;
    return Promise.reject(res);
};

const upsertProjectBatch = async (
    _token: string,
    requests: Array<{
        id?: number;
        name: string;
        description?: string | null;
        status?: string;
        startDate?: string | null;
        endDate?: string | null;
        deletedAt?: string | null;
        workspaceId?: number | null;
        image?: string | null;
    }>
): Promise<ResultOptions<ProjectDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) return (await res.json()) as ResultOptions<ProjectDTO>;
    return Promise.reject(res);
};

const getProjectById = async (_token: string, id: number): Promise<ResultOptions<ProjectDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/project/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<ProjectDTO>;
    return Promise.reject(res);
};

export const projectService = {
    getProjects,
    getProjectById,
    upsertProjectBatch,
};
