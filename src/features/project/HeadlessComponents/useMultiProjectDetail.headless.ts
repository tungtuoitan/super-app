/**
 * MultiProject Detail Headless
 * Side-effects only (useEffect). No params — reads from selector directly.
 * Syncs filtered project data to MultiTimeline store, initializes selection,
 * and loads tasks once at the parent level (shared by TaskList, Kanban, Timeline tabs).
 */

import { useEffect } from "react";
import { useProjectStore } from "../store/useProject.store";
import { useMultiTimelineStore } from "@/features/task/store/useMultiTimeline.store";
import { useMultiProjectDetailSelector } from "../Selectors/useMultiProjectDetail.selector";
import { useMultiProjectDetailHelper } from "../hooks/useMultiProjectDetail.helper";
import { useMultiProjectTaskGridHelper } from "../hooks/useMultiProjectTaskGrid.helper";
import { useAuthStore } from "@/store/index";

export function useMultiProjectDetailHeadless() {
    const { projects } = useProjectStore();
    const { projectIds } = useMultiTimelineStore();
    const { setProjectIds, setProjects } = useMultiTimelineStore();
    const { currentTab, filteredProjectIds, filteredProjects } = useMultiProjectDetailSelector();
    const { setSelectedProjectIds } = useMultiProjectDetailHelper();
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { $user } = useAuthStore();

    // Sync filtered data to MultiTimeline store
    useEffect(() => {
        setProjectIds(filteredProjectIds);
        setProjects(filteredProjects);
    }, [filteredProjectIds, filteredProjects]);

    // Initialize selected projects on first load if not set
    useEffect(() => {
        if (projects.length > 0 && !currentTab?.metadata?.selectedProjectIds) {
            const activeProjects = projects.filter((p) => p.status === "active" && !p.deletedAt);
            setSelectedProjectIds(activeProjects.map((p) => p.id));
        }
    }, [projects, currentTab?.metadata?.selectedProjectIds, setSelectedProjectIds]);

    // Load tasks once at the parent level — shared by TaskList, Kanban, Timeline tabs
    useEffect(() => {
        if (!$user.userId || projectIds.length === 0) return;
        loadTasksForProjects(projectIds);
    }, [$user.userId, projectIds, $user.filters?.taskGrid]);
}
