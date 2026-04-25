/**
 * MultiProject Detail Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Reads from editor tab store and project store to compute filtered project data.
 */

import { useMemo } from "react";
import { useEditorTabsStore } from "@/store/index";
import { useProjectStore } from "@/features/project/store/useProject.store";
import type { TabType } from "../types/multiProjectDetail.type";

export const useMultiProjectDetailSelector = () => {
    const { openTabs, activeTabId } = useEditorTabsStore();
    const { projects } = useProjectStore();

    // Current editor tab
    const currentTab = openTabs.find((t) => t.id === activeTabId) || null;

    // Active inner tab
    const activeTab = (currentTab?.metadata?.innerTab as TabType) || "taskFlow";


    // All available projects (not deleted)
    const availableProjects = projects.filter((p) => !p.deletedAt)


    // Selected project IDs from editor tab metadata
    const selectedProjectIds: number[] = (() => {
        const saved = currentTab?.metadata?.selectedProjectIds as number[] | undefined;
        if (saved && saved.length > 0) return saved;
        const activeProjects = projects.filter((p) => p.status === "active" && !p.deletedAt);
        return activeProjects.map((p) => p.id);
    })()

    // Filtered projects based on selection
    const filteredProjects = availableProjects.filter((p) => selectedProjectIds.includes(p.id))

    // Filtered project IDs
    const filteredProjectIds = filteredProjects.map((p) => p.id)

    return {
        currentTab,
        activeTab,
        availableProjects,
        selectedProjectIds,
        filteredProjects,
        filteredProjectIds,
    };
};
