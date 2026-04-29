/**
 * Workspace Tab Helper
 * Helper functions for managing workspace editor tabs
 */

import { BaseTab } from "@/shell";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "@/shell";
import { useWsDetailStore } from "@/features/workspace/store/ws/useWsDetail.store";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { collectIdsFromTabs, generateTempId, generateUnsavedName } from "@/utils/index";
import {Ws, WsResponse} from "../../types/workspace.types";
import {useEditorTabBarStore} from "@/shell";

export const useWsTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabBarStore();
    const { updateActiveTab } = useEditorTabHelper();
    const { setNewTabAnd } = useEditorTabHelper();
    const { openTab } = useEditorTabHelper();
    const { setShouldFocusWsName } = useWsDetailStore();
    const { workspaces, setWorkspaces } = useWsStore();

    /**
     * Create a new temporary workspace and open its tab
     */
    const openNewWorkspaceTab = () => {
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        const newWorkspace: Ws = {
            id: tempId,
            name,
            description: "",
            statusCode: constants.standardRegistryFE.activeStatus.active,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            userId: 0,
        };

        setWorkspaces([newWorkspace, ...workspaces]);
        openTab(newWorkspace, constants.vscode.tab.tabTypes.workspace);
        setShouldFocusWsName(true);
    };

    /**
     * Open workspace in editor tab
     * If tab already exists, activate it; otherwise create new tab
     */
    const openWorkspaceTab = (workspace: Ws | WsResponse) => {
        // Check if tab already exists for this workspace
        const existingTab = openTabs.find((tab) => tab.type === constants.vscode.tab.tabTypes.workspace && (tab.data as Ws).id === workspace.id);

        if (existingTab) {
            // Tab already exists, just activate it
            updateActiveTab(existingTab.id);
        } else {
            // Normalize WsResponse (string dates) to Ws (Date objects)
            const wsData: Ws = {
                id: workspace.id,
                name: workspace.name,
                description: workspace.description,
                createdAt: workspace.createdAt instanceof Date ? workspace.createdAt : new Date(workspace.createdAt),
                updatedAt: workspace.updatedAt ? (workspace.updatedAt instanceof Date ? workspace.updatedAt : new Date(workspace.updatedAt)) : null,
                deletedAt: workspace.deletedAt ? (workspace.deletedAt instanceof Date ? workspace.deletedAt : new Date(workspace.deletedAt)) : null,
                userId: workspace.userId,
            };

            // Create new workspace tab
            const newTab: BaseTab = {
                id: `workspace-tab-${workspace.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.workspace,
                data: wsData,
                data0: wsData,
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
                    setNewTabAnd(lastTab.id);
                } else {
                    setNewTabAnd(null);
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
            })
        );
    };



    return {
        openNewWorkspaceTab,
        openWorkspaceTab,
        closeWorkspaceTab,
        updateWorkspaceInTabs,
    };
};
