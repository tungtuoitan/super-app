/**
 * MultiProject Detail Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Reads from editor tab store and project store to compute filtered project data.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/features/project";
import type { TabType } from "../types/multiProjectDetail.type";
import { useEditorTabBarHelper } from "@/shell";
import { useMpTaskStore } from "../store/useMpTask.store";

export const useMultiProjectDetailSelector = () => {
    const { getActiveTab } = useEditorTabBarHelper();
    const { projects } = useProjectStore();
    const { taskSearchQuery, taskGridIsLoading } = useMpTaskStore();

    // Current editor tab
    const currentTab = getActiveTab();

    // Active inner tab
    const activeTab = useMemo(() => {
        return (currentTab?.metadata?.innerTab as TabType) || "taskList";
    }, [currentTab?.metadata?.innerTab]);

    // All available projects (not deleted)
    const availableProjects = useMemo(
        () => projects.filter((p) => !p.deletedAt),
        [projects],
    );

    // Selected project IDs from editor tab metadata
    const selectedProjectIds: number[] = useMemo(() => {
        const saved = currentTab?.metadata?.selectedProjectIds as number[] | undefined;
        if (saved && saved.length > 0) return saved;
        const activeProjects = projects.filter((p) => p.status === "active" && !p.deletedAt);
        return activeProjects.map((p) => p.id);
    }, [currentTab?.metadata?.selectedProjectIds, projects]);

    // Filtered projects based on selection
    const filteredProjects = useMemo(
        () => availableProjects.filter((p) => selectedProjectIds.includes(p.id)),
        [availableProjects, selectedProjectIds],
    );

    // Filtered project IDs
    const filteredProjectIds = useMemo(
        () => filteredProjects.map((p) => p.id),
        [filteredProjects],
    );

    return {
        currentTab,
        activeTab,
        availableProjects,
        selectedProjectIds,
        filteredProjects,
        filteredProjectIds,
        taskSearchQuery,
        taskGridIsLoading,
    };
};
