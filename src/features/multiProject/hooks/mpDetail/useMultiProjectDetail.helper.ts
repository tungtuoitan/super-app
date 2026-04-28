/**
 * MultiProject Detail Helper
 * Callbacks only (useCallback). Handles tab switching and project selection.
 * Reads from stores directly — NO params.
 */

import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";
import { useMultiProjectDetailSelector } from "../../Selectors/useMultiProjectDetail.selector";
import type { TabType } from "../../types/multiProjectDetail.type";

export const useMultiProjectDetailHelper = () => {
    const { setOpenTabs, activeTabId } = useEditorTabBarStore();
    const { availableProjects } = useMultiProjectDetailSelector();

    // Update inner tab in editor tab metadata
    const setActiveTab = (newTab: TabType) => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === activeTabId ? { ...t, metadata: { ...t.metadata, innerTab: newTab } } : t,
            ),
        );
    };

    // Update selected project IDs in editor tab metadata
    const setSelectedProjectIds = (updater: number[] | ((prev: number[]) => number[])) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.id !== activeTabId) return t;
                const currentSelected = (t.metadata?.selectedProjectIds as number[]) || [];
                const newSelected = typeof updater === "function" ? updater(currentSelected) : updater;
                return { ...t, metadata: { ...t.metadata, selectedProjectIds: newSelected } };
            }),
        );
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
    };
};
