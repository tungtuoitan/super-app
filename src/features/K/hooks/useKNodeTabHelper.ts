/**
 * KTab Helper Hook
 * Opens knowledge editor tabs (create new / edit existing)
 */


import { constants } from "@/shared";
import { shellConstants } from "@/shell/shell.constants";
import type { BaseTab } from "@/shell";
import type { KItemV2 } from "../types/K-v2.types";
import {useEditorTabBarStore} from "@/shell";


export function useKNodeTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabBarStore();

    const SINGLETON_ID = "k-node-tab";

    const openKNodeTab = (node: KItemV2) => {
        const existing = openTabs.find((t) => t.type === shellConstants.vscode.tab.tabTypes.kNode);
        if (existing) {
            // Update the singleton tab with the new node data
            setOpenTabs((prev) =>
                prev.map((t) =>
                    t.type === shellConstants.vscode.tab.tabTypes.kNode
                        ? { ...t, data: node, data0: node, title: node.name }
                        : t
                )
            );
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: SINGLETON_ID,
                type: shellConstants.vscode.tab.tabTypes.kNode,
                data: node,
                data0: node,
                title: node.name,
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    };

    return { openKNodeTab };
}


