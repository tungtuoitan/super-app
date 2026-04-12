/**
 * Unsaved Tabs Helper
 * Utility to check for unsaved tabs before navigation
 */

import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { WorkspaceDTO } from "@/features/workspace/types/workspace-dto.types";

/**
 * Check if any tab has unsaved changes and belongs to current workspace
 */
export const hasNewTabsInCurrentWorkspace = (openTabs: BaseTab[], moduleName: string): boolean => {
    return moduleName === constants.modules.workspace && openTabs.some((tab) => {
        // MultiProject tabs don't have an id property
        if (tab.type === "multiProject") return false;
        return (tab.data as { id: number }).id < 0;
    });
};

