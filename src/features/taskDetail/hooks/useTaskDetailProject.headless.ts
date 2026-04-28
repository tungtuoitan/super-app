/**
 * Task Detail Project Headless
 * Auto-caches project data when tasks are opened
 */

import { useEffect } from "react";
import { usePTaskStore } from "../store/usePTask.store";
import { useEditorTabBarStore } from "@/shell/store/EditorTab.store";
import { useTaskDetailProjectCacheHelper } from "./useTaskDetailProjectCache.helper";
import type { Task } from "../types/task.types";

export function useTaskDetailProjectHeadless() {
    const { openTabs, activeTabId } = useEditorTabBarStore();
    const { ensureProjectCached } = useTaskDetailProjectCacheHelper();

    // Cache project when task detail opens
    useEffect(() => {
        const activeTab = openTabs.find((tab) => tab.id === activeTabId);
        if (!activeTab) return;

        const task = activeTab.data as Task;
        if (task?.projectId) {
            ensureProjectCached(task.projectId);
        }
    }, [activeTabId, openTabs, ensureProjectCached]);
}
