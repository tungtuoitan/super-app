/**
 * Workspace Tab Helper
 * Helper functions for managing workspace editor tabs
 */

import { Ws } from "@/store/ws/useWs.store";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "../../store";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";

export const useWsTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabsStore();
    const { updateActiveTab } = useEditorTabHelper();

    /**
     * Open workspace in editor tab
     * If tab already exists, activate it; otherwise create new tab
     */
    const openWorkspaceTab = (workspace: Ws) => {
        // Check if tab already exists for this workspace
        const existingTab = openTabs.find((tab) => tab.type === constants.vscode.tab.tabTypes.workspace && (tab.data as Ws).id === workspace.id);

        if (existingTab) {
            // Tab already exists, just activate it
            updateActiveTab(existingTab.id);
        } else {
            // Create new workspace tab
            const newTab: BaseTab = {
                id: `workspace-tab-${workspace.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.workspace,
                data: workspace,
                title: workspace.name || "Unsaved Workspace",
                hasUnsavedChanges: false,
            };

            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            updateActiveTab(newTab.id, newTabs);
        }
    };

    /**
     * Close workspace tab
     */
    const closeWorkspaceTab = (tabId: string) => {
        setOpenTabs((prev) => {
            const newTabs = prev.filter((t) => t.id !== tabId);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Switch to the last tab
                    const lastTab = newTabs[newTabs.length - 1];
                    setActiveTabId(lastTab.id);
                } else {
                    setActiveTabId(null);
                }
            }

            return newTabs;
        });
    };

    /**
     * Update workspace in all tabs
     * When workspace is updated, sync it across all open tabs
     */
    const updateWorkspaceInTabs = (workspaceId: number, updatedWorkspace: Partial<Ws>) => {
        setOpenTabs((prev) =>
            prev.map((tab) => {
                if (tab.type === constants.vscode.tab.tabTypes.workspace && (tab.data as Ws).id === workspaceId) {
                    const wsData = tab.data as Ws;
                    return {
                        ...tab,
                        data: { ...wsData, ...updatedWorkspace },
                        title: updatedWorkspace.name || tab.title,
                    };
                }
                return tab;
            }),
        );
    };

    /**
     * Mark workspace tab as having unsaved changes
     */
    const markWorkspaceTabUnsaved = (tabId: string, hasChanges: boolean) => {
        setOpenTabs((prev: BaseTab[]) => prev.map((tab) => (tab.id === tabId ? { ...tab, hasUnsavedChanges: hasChanges } : tab)));
    };

    return {
        openWorkspaceTab,
        closeWorkspaceTab,
        updateWorkspaceInTabs,
        markWorkspaceTabUnsaved,
    };
};
