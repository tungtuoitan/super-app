/**
 * Project Workspace Resolver
 * Resolves a project's workspaceId by ID.
 * Checks the local project store first; fetches from API on a cache miss and
 * merges the result back into the store.
 */

import { useRef, useEffect } from "react";
import { useAuthStore, parseAsLocalDate } from "@/shared";
import { useProjectStore } from "../store/useProject.store";
import { projectService } from "../service/project.service";
import type { ProjectDTO } from "../service/project.service";
import type { Project } from "../types/project.types";

export function useProjectWorkspaceResolver() {
    const { $user } = useAuthStore();
    const { projects, setProjects } = useProjectStore();

    const projectsRef = useRef(projects);
    useEffect(() => { projectsRef.current = projects; }, [projects]);

    /**
     * Returns the workspaceId for a given projectId.
     * Looks up from the local store first; falls back to an API fetch and
     * caches the result in the project store.
     */
    const resolveWorkspaceId = async (projectId: number): Promise<number | null | undefined> => {
        const found = projectsRef.current.find((p) => p.id === projectId);
        if (found) return found.workspaceId;

        const token = $user.userToken ?? "";
        const result = await projectService.getProjects(token, { ids: projectId.toString() });
        if (result.success && result.data && result.data.length > 0) {
            const dto = (result.data as ProjectDTO[])[0];
            const fetched: Project = {
                id: dto.id,
                name: dto.name,
                description: dto.description,
                status: dto.status,
                startDate: parseAsLocalDate(dto.startDate),
                endDate: parseAsLocalDate(dto.endDate),
                createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
                updatedAt: parseAsLocalDate(dto.updatedAt),
                deletedAt: parseAsLocalDate(dto.deletedAt),
                workspaceId: dto.workspaceId,
            };
            setProjects((prev) => {
                const ids = new Set(prev.map((p) => p.id));
                return ids.has(fetched.id) ? prev : [...prev, fetched];
            });
            return dto.workspaceId;
        }
        return null;
    };

    return { resolveWorkspaceId };
}
