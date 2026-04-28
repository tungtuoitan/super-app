/**
 * MultiProject Detail Headless
 * Side-effects only (useEffect). No params — reads from selector directly.
 * Syncs filtered project data to MultiTimeline store, initializes selection,
 * and loads tasks once at the parent level (shared by TaskList, Kanban, Timeline tabs).
 */

import { useEffect } from "react";
import { useProjectStore } from "@/features/project";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiProjectDetailSelector } from "../../Selectors/useMultiProjectDetail.selector";
import { useMultiProjectDetailHelper } from "./useMultiProjectDetail.helper";
import { useMultiProjectTaskGridHelper } from "../mpTaskList/useMultiProjectTaskGrid.helper";
import {useAuthStore} from "@/shell/store/Auth.store";

export function useMultiProjectDetailHeadless() {
    const { projects } = useProjectStore();
    const { projectIds, mode} = useMultiTimelineStore();
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
    }, [projects, currentTab?.metadata?.selectedProjectIds]);

    // Load tasks once at the parent level — shared by TaskList, Kanban, Timeline tabs
    useEffect(() => {
        if (!$user.userId || projectIds.length === 0 || mode !== "task") return;
        loadTasksForProjects(projectIds);
    }, [$user.userId, projectIds, $user.filters?.taskGrid, mode]);
}
