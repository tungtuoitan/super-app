/**
 * MultiProject Detail Helper
 * Callbacks only (useCallback). Handles tab switching and project selection.
 * Reads from stores directly — NO params.
 */

import { useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { useMultiProjectDetailSelector } from "../Selectors/useMultiProjectDetail.selector";
import type { TabType } from "../types/multiProjectDetail.type";

export const useMultiProjectDetailHelper = () => {
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { availableProjects } = useMultiProjectDetailSelector();

    // Update inner tab in editor tab metadata
    const setActiveTab = useCallback((newTab: TabType) => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === activeTabId ? { ...t, metadata: { ...t.metadata, innerTab: newTab } } : t,
            ),
        );
    }, [activeTabId, setOpenTabs]);

    // Update selected project IDs in editor tab metadata
    const setSelectedProjectIds = useCallback((updater: number[] | ((prev: number[]) => number[])) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.id !== activeTabId) return t;
                const currentSelected = (t.metadata?.selectedProjectIds as number[]) || [];
                const newSelected = typeof updater === "function" ? updater(currentSelected) : updater;
                return { ...t, metadata: { ...t.metadata, selectedProjectIds: newSelected } };
            }),
        );
    }, [activeTabId, setOpenTabs]);

    // Toggle a single project
    const handleToggleProject = useCallback((projectId: number) => {
        setSelectedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    }, [setSelectedProjectIds]);

    // Select all active projects
    const handleSelectAllActive = useCallback(() => {
        setSelectedProjectIds(availableProjects.filter((p) => p.status === "active").map((p) => p.id));
    }, [setSelectedProjectIds, availableProjects]);

    // Select all projects
    const handleSelectAll = useCallback(() => {
        setSelectedProjectIds(availableProjects.map((p) => p.id));
    }, [setSelectedProjectIds, availableProjects]);

    // Clear all selections
    const handleClearAll = useCallback(() => {
        setSelectedProjectIds([]);
    }, [setSelectedProjectIds]);

    return {
        setActiveTab,
        setSelectedProjectIds,
        handleToggleProject,
        handleSelectAllActive,
        handleSelectAll,
        handleClearAll,
    };
};
