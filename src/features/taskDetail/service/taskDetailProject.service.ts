/**
 * Task Detail Project Service
 * Fetches project information needed by taskDetail feature
 * Independent of project feature — makes direct API calls only
 */

import { config } from "@/utils/config/app.config";
import type { Project } from "../types/task.types";
import {apiFetch} from "@/shared/index";

/**
 * Fetch a single project by ID
 */
export async function fetchProjectById(_token: string, projectId: number): Promise<Project | null> {
    const url = `${config.api.baseURL}/api/project/${projectId}`;

    try {
        const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        if (res.ok) {
            const data = await res.json();
            return data.data ?? null;
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch project ${projectId}:`, error);
        return null;
    }
}

/**
 * Fetch multiple projects by IDs
 */
export async function fetchProjectsByIds(token: string, projectIds: number[]): Promise<Record<number, Project>> {
    const cache: Record<number, Project> = {};

    await Promise.all(
        projectIds.map(async (id) => {
            const project = await fetchProjectById(token, id);
            if (project) {
                cache[id] = project;
            }
        })
    );

    return cache;
}
