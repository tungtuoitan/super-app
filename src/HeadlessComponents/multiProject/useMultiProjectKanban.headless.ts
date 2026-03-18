/**
 * Multi-Project Kanban Headless
 * Side-effects only (useEffect). Handles data loading.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import { useEffect } from "react";
import { useMultiProjectTaskGridHelper } from "@/hooks/multiProject/useMultiProjectTaskGrid.helper";
import { useAuthStore } from "@/store/index";
import { useMultiTimelineStore } from "@/store/task/useMultiTimeline.store";

export function useMultiProjectKanbanHeadless() {
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { $user } = useAuthStore();
    const { projectIds } = useMultiTimelineStore();

    // Load tasks when user is ready and projectIds change
    useEffect(() => {
        if (!$user.userId || projectIds.length === 0) return;
        loadTasksForProjects(projectIds);
    }, [$user.userId, projectIds, $user.filters?.taskGrid]);
}
