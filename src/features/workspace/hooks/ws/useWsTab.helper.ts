/**
 * Workspace Tab Helper
 * Helper functions for managing workspace editor tabs.
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import { useWsDetailStore } from "@/features/workspace/store/ws/useWsDetail.store";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { standardRegistryConstants } from "@/shared";
import type { Ws, WsResponse } from "../../types/workspace.types";
import { collectIdsFromTabs, generateTempId, generateUnsavedName } from "../../utils/temp-id.utils";

const TAB_TYPE = shellConstants.vscode.tab.tabTypes.workspace;

export const useWsTabHelper = () => {
    const { openTab, openTabs, closeTab, updateTabData } = useEditorTabBarHelper();
    const { setShouldFocusWsName } = useWsDetailStore();
    const { workspaces, setWorkspaces } = useWsStore();

    /**
     * Create a new temporary workspace and open its tab.
     */
    const openNewWorkspaceTab = () => {
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        const newWorkspace: Ws = {
            id: tempId,
            name,
            description: "",
            statusCode: standardRegistryConstants.activeStatus.active,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            userId: 0,
        };

        setWorkspaces([newWorkspace, ...workspaces]);
        openTab(newWorkspace, TAB_TYPE, { title: name });
        setShouldFocusWsName(true);
    };

    /**
     * Open workspace in editor tab.
     * If tab already exists → activate it. Otherwise → create new tab.
     */
    const openWorkspaceTab = (workspace: Ws | WsResponse) => {
        // Normalise WsResponse (string dates) → Ws (Date objects)
        const wsData: Ws = {
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            statusCode: (workspace as Ws).statusCode,
            createdAt: workspace.createdAt instanceof Date ? workspace.createdAt : new Date(workspace.createdAt),
            updatedAt: workspace.updatedAt
                ? workspace.updatedAt instanceof Date ? workspace.updatedAt : new Date(workspace.updatedAt)
                : null,
            deletedAt: workspace.deletedAt
                ? workspace.deletedAt instanceof Date ? workspace.deletedAt : new Date(workspace.deletedAt)
                : null,
            userId: workspace.userId,
        };
        openTab(wsData, TAB_TYPE, { title: wsData.name || "Unsaved Workspace" });
    };

    /**
     * Close workspace tab — fires onTabClose module callbacks via shell.
     */
    const closeWorkspaceTab = (tabId: string) => {
        closeTab(tabId);
    };

    /**
     * Sync updated workspace data into any open tabs showing this workspace.
     */
    const updateWorkspaceInTabs = (workspaceId: number, updatedWorkspace: Partial<Ws>) => {
        updateTabData(
            TAB_TYPE,
            workspaceId,
            (current: Ws) => ({ ...(current as Ws), ...updatedWorkspace }),
            updatedWorkspace.name,
        );
    };

    return {
        openNewWorkspaceTab,
        openWorkspaceTab,
        closeWorkspaceTab,
        updateWorkspaceInTabs,
    };
};
