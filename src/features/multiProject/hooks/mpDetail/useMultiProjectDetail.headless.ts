/**
 * MultiProject Detail Headless
 * Side-effects only (useEffect). No params — reads from selector directly.
 * Syncs filtered project data to MultiTimeline store, initializes selection,
 * and loads tasks once at the parent level (shared by TaskList, Kanban, Timeline tabs).
 */

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/features/project";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiProjectDetailSelector } from "../../Selectors/useMultiProjectDetail.selector";
import { useMultiProjectDetailHelper } from "./useMultiProjectDetail.helper";
import { useMultiProjectTaskGridHelper } from "../mpTaskList/useMultiProjectTaskGrid.helper";
import {useAuthStore} from "@/shared";
import { projectConstants } from "@/features/project/project.constants";

export function useMultiProjectDetailHeadless() {
    const { projects } = useProjectStore();
    const { projectIds } = useMultiTimelineStore();
    const { setProjectIds, setProjects } = useMultiTimelineStore();
    const { currentTab, activeTab, filteredProjectIds, filteredProjects } = useMultiProjectDetailSelector();
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
            const activeProjects = projects.filter((p) => projectConstants.liveStatuses.includes(p.status) && !p.deletedAt);
            setSelectedProjectIds(activeProjects.map((p) => p.id));
        }
    }, [projects, currentTab?.metadata?.selectedProjectIds]);

    // Load tasks once per (projects, filters) at the parent level — shared by TaskList, Kanban, Timeline tabs.
    // Not tied to the timeline mode / tab: switching tabs must not refetch (use the Refresh button for that).
    // The Project timeline doesn't need tasks, so skip while it is the active tab.
    const loadedKeyRef = useRef("");
    useEffect(() => {
        if (!$user.userId || projectIds.length === 0 || activeTab === "proTimeline") return;
        const key = `${projectIds.join(",")}|${JSON.stringify($user.filters?.taskGrid ?? null)}`;
        if (loadedKeyRef.current === key) return;
        loadedKeyRef.current = key;
        loadTasksForProjects(projectIds);
    }, [$user.userId, projectIds, $user.filters?.taskGrid, activeTab]);
}
