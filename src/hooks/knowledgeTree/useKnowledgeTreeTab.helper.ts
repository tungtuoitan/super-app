import { useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { Knowledge } from "@/types/knowledgeTree.types";

export function useKnowledgeTreeTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();

    const openKnowledgeTab = useCallback(
        (knowledge: Knowledge) => {
            const existing = openTabs.find(
                (t) =>
                    t.type === constants.vscode.tab.tabTypes.knowledgeTree &&
                    (t.data as Knowledge).id === knowledge.id
            );
            if (existing) {
                setActiveTabId(existing.id);
            } else {
                const newTab: BaseTab = {
                    id: `knowledge-tab-${knowledge.id}`,
                    type: constants.vscode.tab.tabTypes.knowledgeTree,
                    data: knowledge,
                    data0: knowledge,
                    title: knowledge.title,
                    hasUnsavedChanges: false,
                };
                setOpenTabs((prev) => [...prev, newTab]);
                setActiveTabId(newTab.id);
            }
        },
        [openTabs, setOpenTabs, setActiveTabId]
    );

    return { openKnowledgeTab };
}
