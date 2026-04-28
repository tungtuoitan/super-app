/**
 * Task Detail Project Cache Helper
 * Manages fetching and caching of projects needed by taskDetail
 */

import { useCallback } from "react";
import { useTaskDetailProjectStore } from "../store/useTaskDetailProject.store";
import { useAuthStore } from "@/shell/store/Auth.store";
import { fetchProjectById } from "../service/taskDetailProject.service";

export const useTaskDetailProjectCacheHelper = () => {
    const { projectsCache, setProjectsCache } = useTaskDetailProjectStore();
    const { $user } = useAuthStore();

    /**
     * Ensure a project is cached. Fetch if not already cached.
     */
    const ensureProjectCached = useCallback(
        async (projectId: number) => {
            // Already cached
            if (projectsCache[projectId]) return;

            // Fetch and cache
            const project = await fetchProjectById($user.userToken, projectId);
            if (project) {
                setProjectsCache((prev) => ({ ...prev, [projectId]: project }));
            }
        },
        [projectsCache, $user.userToken, setProjectsCache]
    );

    /**
     * Ensure multiple projects are cached
     */
    const ensureProjectsCached = useCallback(
        async (projectIds: number[]) => {
            const toFetch = projectIds.filter((id) => !projectsCache[id]);
            if (toFetch.length === 0) return;

            const promises = toFetch.map((id) => fetchProjectById($user.userToken, id));
            const projects = await Promise.all(promises);

            const newCache = { ...projectsCache };
            projects.forEach((project, index) => {
                if (project) {
                    newCache[toFetch[index]] = project;
                }
            });
            setProjectsCache(newCache);
        },
        [projectsCache, $user.userToken, setProjectsCache]
    );

    return {
        ensureProjectCached,
        ensureProjectsCached,
    };
};
