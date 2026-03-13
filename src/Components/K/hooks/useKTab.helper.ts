/**
 * KTab Helper Hook
 * Opens knowledge editor tabs (create new / edit existing)
 */

import { useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { KWsResponse } from "@/Components/K/types/K.types";
import { useKStore } from "@/Components/K/store/K.store";

export function useKTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();
    const { allK, setAllK } = useKStore();

    /** Open existing knowledge editor tab */
    const openKnowledgeTab = useCallback((knowledge: KWsResponse) => {
        const existing = openTabs.find(
            (t) => t.type === constants.vscode.tab.tabTypes.kKnowledge && (t.data as KWsResponse).id === knowledge.id
        );
        if (existing) {
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `k-knowledge-tab-${knowledge.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.kKnowledge,
                data: knowledge,
                data0: knowledge,
                title: "Knowledge",
                // title: knowledge.name || "Knowledge",
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }, [openTabs, setOpenTabs, setActiveTabId]);

    /** Create temp knowledge (negative ID), push to store, open tab */
    const openNewKnowledgeTab = useCallback(() => {
        const tempId = -Date.now();
        const now = new Date().toISOString();
        const tempKnowledge: KWsResponse = {
            id: tempId,
            userId: 0,
            name: "New Knowledge",
            description: undefined,
            imageBase64: undefined,
            statusCode: undefined,
            createdAt: now,
            updatedAt: undefined,
            deletedAt: null,
        };
        setAllK((prev) => [...prev, tempKnowledge]);
        const newTab: BaseTab = {
            id: `k-knowledge-tab-${tempId}`,
            type: constants.vscode.tab.tabTypes.kKnowledge,
            data: tempKnowledge,
            data0: tempKnowledge,
            title: "New Knowledge",
            hasUnsavedChanges: true,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
    }, [setAllK, setOpenTabs, setActiveTabId]);

    return { openKnowledgeTab, openNewKnowledgeTab };
}

