/**
 * KNode Tab Helper Hook
 * Opens the singleton kNode editor tab.
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import type { KItemV2 } from "../types/K-v2.types";

const K_NODE_TAB_TYPE = shellConstants.vscode.tab.tabTypes.kNode;
const K_NODE_TAB_ID   = "k-node-tab";

export function useKNodeTabHelper() {
    const { openSingletonTab } = useEditorTabBarHelper();

    /** Open the singleton kNode tab, swapping in the given node's data. */
    const openKNodeTab = (node: KItemV2) => {
        openSingletonTab(
            K_NODE_TAB_TYPE,
            { title: node.name, tabId: K_NODE_TAB_ID },
            node,
        );
    };

    return { openKNodeTab };
}
