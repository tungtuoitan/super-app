/**
 * Link service — task/project links + file rename/url (LinkController, task #1477).
 */
import { config } from "config/app.config";
import { apiFetch } from "../fetch/apiClient";
import type { ResultOptions } from "../fetch/resultOptions.types";
import type { AddLinkRequest, LinkDTO, TaskFolderRef, UpdateFileRequest } from "./link.types";

const _json = async <T>(res: Response): Promise<T> => {
    if (res.ok) return (await res.json()) as T;
    return Promise.reject(res);
};

const _getTaskLinks = async (taskId: number): Promise<ResultOptions<LinkDTO>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/task/${taskId}/links`));

const _addTaskLink = async (taskId: number, body: AddLinkRequest): Promise<ResultOptions<LinkDTO>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/task/${taskId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));

const _removeTaskLink = async (taskId: number, workspaceItemId: number): Promise<ResultOptions<unknown>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/task/${taskId}/links/${workspaceItemId}`, { method: "DELETE" }));

/** Task folder (created by the BE when missing) — a new task note is placed there (task #1487). */
const _getOrCreateTaskFolder = async (taskId: number): Promise<ResultOptions<TaskFolderRef>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/task/${taskId}/folder`, { method: "POST" }));

const _getProjectLinks = async (projectId: number): Promise<ResultOptions<LinkDTO>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/project/${projectId}/links`));

const _addProjectLink = async (projectId: number, body: AddLinkRequest): Promise<ResultOptions<LinkDTO>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/project/${projectId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));

const _removeProjectLink = async (projectId: number, workspaceItemId: number): Promise<ResultOptions<unknown>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/project/${projectId}/links/${workspaceItemId}`, { method: "DELETE" }));

const _updateFile = async (fileId: number, body: UpdateFileRequest): Promise<ResultOptions<unknown>> =>
    _json(await apiFetch(`${config.api.baseURL}/api/file/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));

export const linkService = {
    _getTaskLinks,
    _addTaskLink,
    _removeTaskLink,
    _getOrCreateTaskFolder,
    _getProjectLinks,
    _addProjectLink,
    _removeProjectLink,
    _updateFile,
};
