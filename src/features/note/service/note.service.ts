/**
 * Note Service - API communication for note operations
 */

import { config } from "config/app.config";
import type { NoteDTO } from "../types/note.types";
import type { ResultOptions } from "@/shared";
import { apiFetch } from "@/shared";

const _getNotes = async (
    _token: string,
    params?: {
        searchText?: string;
        page?: number;
        pageSize?: number;
        type?: string;
        isArchived?: boolean;
        statusCode?: string;
        deletedAt?: string;
        createdAtFrom?: string;
        createdAtTo?: string;
        ids?: string;
        workspaceItemIds?: string;
    },
) => {
    const queryParams = new URLSearchParams();
    if (params?.searchText) queryParams.append("searchText", params.searchText);
    if (params?.page !== undefined) queryParams.append("page", String(params.page));
    if (params?.pageSize !== undefined) queryParams.append("pageSize", String(params.pageSize));
    if (params?.type) queryParams.append("type", params.type);
    if (params?.isArchived !== undefined) queryParams.append("isArchived", String(params.isArchived));
    if (params?.statusCode) queryParams.append("statusCode", params.statusCode);
    if (params?.deletedAt) queryParams.append("deletedAt", params.deletedAt);
    if (params?.createdAtFrom) queryParams.append("createdAtFrom", params.createdAtFrom);
    if (params?.createdAtTo) queryParams.append("createdAtTo", params.createdAtTo);
    if (params?.ids) queryParams.append("ids", params.ids);
    if (params?.workspaceItemIds) queryParams.append("workspaceItemIds", params.workspaceItemIds);

    const queryString = queryParams.toString();
    const url = queryString ? `${config.api.baseURL}/api/notes?${queryString}` : `${config.api.baseURL}/api/notes`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

    if (res.ok) return (await res.json()) as ResultOptions<NoteDTO>;
    return Promise.reject(res);
};

const _getNoteById = async (_token: string, noteId: number) => {
    const res = await apiFetch(`${config.api.baseURL}/api/notes/${noteId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return (await res.json()) as ResultOptions<NoteDTO>;
    return Promise.reject(res);
};

const _upsertNotes = async (
    _token: string,
    requests: Array<{
        id: number;
        name: string;
        description?: string;
        type?: string;
        statusCode?: string;
        isArchived?: boolean;
        deletedAt?: string | null;
    }>,
) => {
    const res = await apiFetch(`${config.api.baseURL}/api/notes/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });

    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

const _deleteNote = async (_token: string, noteId: number | string) => {
    const res = await apiFetch(`${config.api.baseURL}/api/notes/${noteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });

    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

export const noteService = {
    _getNotes,
    _getNoteById,
    _upsertNotes,
    _deleteNote,
};
