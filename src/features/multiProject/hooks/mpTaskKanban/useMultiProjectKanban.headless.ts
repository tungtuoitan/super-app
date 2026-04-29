/**
 * Multi-Project Kanban Headless
 * Side-effects only (useEffect). Handles data loading.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import { useEffect } from "react";
import { useMultiProjectTaskGridHelper } from "../mpTaskList/useMultiProjectTaskGrid.helper";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import {useAuthStore} from "@/shell";

export function useMultiProjectKanbanHeadless() {
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { $user } = useAuthStore();
    const { projectIds } = useMultiTimelineStore();

    // Load tasks when user is ready and projectIds change
    // useEffect(() => {
    //     if (!$user.userId || projectIds.length === 0) return;
    //     loadTasksForProjects(projectIds);
    // }, [$user.userId, projectIds, $user.filters?.taskGrid]);
}
