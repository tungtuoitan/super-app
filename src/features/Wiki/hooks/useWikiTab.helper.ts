/**
 * Wiki Tab Helper
 * Opens/updates the singleton wiki tab.
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import type { WikiTabData } from "../types/wiki.type";

const WIKI_TAB_TYPE = shellConstants.vscode.tab.tabTypes.wikiInfo;
const WIKI_TAB_ID   = "wiki-singleton-tab";

export const useWikiTabHelper = () => {
    const { openSingletonTab } = useEditorTabBarHelper();

    /** Open (or reuse) the singleton wiki tab, optionally focusing a keyword. */
    const openWikiTab = (keywordId: number | null = null) => {
        const data: WikiTabData = { keywordId };
        openSingletonTab(WIKI_TAB_TYPE, { title: "Wiki", tabId: WIKI_TAB_ID }, data);
    };

    return { openWikiTab };
};
