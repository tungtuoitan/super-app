/**
 * MultiProject Detail Helper
 * Callbacks only (useCallback). Handles tab switching and project selection.
 * Reads from stores directly — NO params.
 */

import { useEditorTabBarHelper } from "@/shell";
import { useMultiProjectDetailSelector } from "../../Selectors/useMultiProjectDetail.selector";
import type { TabType } from "../../types/multiProjectDetail.type";
import { useMpTaskStore } from "../../store/useMpTask.store";

export const useMultiProjectDetailHelper = () => {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { availableProjects } = useMultiProjectDetailSelector();
    const { setTaskSearchQuery } = useMpTaskStore();

    // Update inner tab in editor tab metadata
    const setActiveTab = (newTab: TabType) => {
        const activeTabId = getActiveTab()?.id;
        if (!activeTabId) return;
        patchTab(activeTabId, (cur) => ({ metadata: { ...cur.metadata, innerTab: newTab } }));
    };

    // Update selected project IDs in editor tab metadata
    const setSelectedProjectIds = (updater: number[] | ((prev: number[]) => number[])) => {
        const activeTabId = getActiveTab()?.id;
        if (!activeTabId) return;
        patchTab(activeTabId, (cur) => {
            const currentSelected = (cur.metadata?.selectedProjectIds as number[]) || [];
            const newSelected = typeof updater === "function" ? updater(currentSelected) : updater;
            return { metadata: { ...cur.metadata, selectedProjectIds: newSelected } };
        });
    };

    // Toggle a single project
    const handleToggleProject = (projectId: number) => {
        setSelectedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    };

    // Select all active projects
    const handleSelectAllActive = () => {
        setSelectedProjectIds(availableProjects.filter((p) => p.status === "active").map((p) => p.id));
    };

    // Select all projects
    const handleSelectAll = () => {
        setSelectedProjectIds(availableProjects.map((p) => p.id));
    };

    // Clear all selections
    const handleClearAll = () => {
        setSelectedProjectIds([]);
    };

    return {
        setActiveTab,
        setSelectedProjectIds,
        handleToggleProject,
        handleSelectAllActive,
        handleSelectAll,
        handleClearAll,
        setTaskSearchQuery,
    };
};
