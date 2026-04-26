/**
 * Project Detail Headless
 * Side-effects only (useEffect). Loads tasks once at the project level.
 * Child tab views (TaskGrid, Kanban, Timeline) share the same task store
 * and do NOT need to reload tasks on every tab switch.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskGridHelper } from "@/features/task/hooks/taskList/useTaskGrid.helper";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { useAuthStore } from "@/store/index";

export function ProjectDetailHeadless() {
    const { loadTasks } = useTaskGridHelper();
    const { $user } = useAuthStore();
    const { projectId } = useProjectDetailStore();

    // Load tasks once at the project level — shared by TaskGrid, Kanban, Timeline tabs
    useEffect(() => {
        if (!$user.userId) return;
        loadTasks(projectId);
    }, [$user.userId, projectId, $user.filters?.taskGrid]);

    return null;
}
