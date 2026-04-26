
import { useEditorTabBarStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/shell/types/tab.types";
import type { WikiTabData } from "../types/wiki.type";

const WIKI_TAB_ID = "wiki-singleton-tab";

export const useWikiTabHelper = () => {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabBarStore();

    /** Open (or reuse) the singleton wiki tab, optionally focusing a keyword */
    const openWikiTab = (keywordId: number | null = null) => {
        const data: WikiTabData = { keywordId };
        const existing = openTabs.find(t => t.type === constants.vscode.tab.tabTypes.wikiInfo);

        if (existing) {
            setOpenTabs(prev => prev.map(t =>
                t.id === existing.id ? { ...t, data } : t
            ));
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: WIKI_TAB_ID,
                type: constants.vscode.tab.tabTypes.wikiInfo,
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
