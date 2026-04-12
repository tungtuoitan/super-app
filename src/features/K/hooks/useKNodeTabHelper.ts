/**
 * KTab Helper Hook
 * Opens knowledge editor tabs (create new / edit existing)
 */

import { useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { KItemV2 } from "../types/K-v2.types";


export function useKNodeTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();

    const SINGLETON_ID = "k-node-tab";

    const openKNodeTab = useCallback((node: KItemV2) => {
        const existing = openTabs.find((t) => t.type === constants.vscode.tab.tabTypes.kNode);
        if (existing) {
            // Update the singleton tab with the new node data
            setOpenTabs((prev) =>
                prev.map((t) =>
                    t.type === constants.vscode.tab.tabTypes.kNode
                        ? { ...t, data: node, data0: node, title: node.name }
                        : t
                )
            );
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: SINGLETON_ID,
                type: constants.vscode.tab.tabTypes.kNode,
                data: node,
                data0: node,
                title: node.name,
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }, [openTabs, setOpenTabs, setActiveTabId]);

    return { openKNodeTab };
}
