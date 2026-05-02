
import { constants } from "@/shared";
import { shellConstants } from "@/shell";
import type { BaseTab } from "@/shell";
import type { WikiTabData } from "../types/wiki.type";
import {useEditorTabBarStore} from "@/shell";

const WIKI_TAB_ID = "wiki-singleton-tab";

export const useWikiTabHelper = () => {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabBarStore();

    /** Open (or reuse) the singleton wiki tab, optionally focusing a keyword */
    const openWikiTab = (keywordId: number | null = null) => {
        const data: WikiTabData = { keywordId };
        const existing = openTabs.find(t => t.type === shellConstants.vscode.tab.tabTypes.wikiInfo);

        if (existing) {
            setOpenTabs(prev => prev.map(t =>
                t.id === existing.id ? { ...t, data } : t
            ));
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: WIKI_TAB_ID,
                type: shellConstants.vscode.tab.tabTypes.wikiInfo,
                data,
                data0: data,
                title: "Wiki",
                hasUnsavedChanges: false,
            };
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }

    return { openWikiTab };
};


