/**
 * Task Detail Project Service
 * Fetches project information needed by taskDetail feature
 * Independent of project feature — makes direct API calls only
 */

import type { Project } from "../types/task.types";
import { apiClient } from "@/utils/apiClient";

/**
 * Fetch a single project by ID
 */
export async function fetchProjectById(token: string, projectId: number): Promise<Project | null> {
    try {
        const response = await apiClient.get(`/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data?.data ?? null;
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
