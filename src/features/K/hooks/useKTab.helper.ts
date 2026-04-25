/**
 * KTab Helper Hook
 * Opens knowledge editor tabs (create new / edit existing)
 */


import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { KWsResponse } from "../types/K.types";
import { useKStore } from "../store/K.store";

export function useKTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();
    const { allK, setAllK } = useKStore();

    /** Open existing knowledge editor tab (reuse single tab) */
    const openKnowledgeTab = (knowledge: KWsResponse) => {
        const existing = openTabs.find(
            (t) => t.type === constants.vscode.tab.tabTypes.kKnowledge
        );
        if (existing) {
            // Reuse — swap data to the new knowledge
            const isSame = (existing.data as KWsResponse).id === knowledge.id;
            if (!isSame) {
                setOpenTabs((prev) =>
                    prev.map((t) =>
                        t.id === existing.id
                            ? { ...t, data: knowledge, data0: knowledge, title: knowledge.name || "Knowledge", hasUnsavedChanges: false }
                            : t,
                    ),
                );
            }
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `k-knowledge-tab-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.kKnowledge,
                data: knowledge,
                data0: knowledge,
                title: knowledge.name || "Knowledge",
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }

    /** Create temp knowledge (negative ID), push to store, open tab (reuse single tab) */
    const openNewKnowledgeTab = () => {
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
        setAllK((prev: KWsResponse[]) => [...prev, tempKnowledge]);

        const existing = openTabs.find(
            (t) => t.type === constants.vscode.tab.tabTypes.kKnowledge
        );
        if (existing) {
            setOpenTabs((prev) =>
                prev.map((t) =>
                    t.id === existing.id
                        ? { ...t, data: tempKnowledge, data0: tempKnowledge, title: "New Knowledge", hasUnsavedChanges: true }
                        : t,
                ),
            );
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `k-knowledge-tab-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.kKnowledge,
                data: tempKnowledge,
                data0: tempKnowledge,
                title: "New Knowledge",
                hasUnsavedChanges: true,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }

    /** Open global daily review tab (singleton — reuse if already open) */
    const openGlobalDailyReviewTab = () => {
        const existing = openTabs.find(
            (t) => t.type === constants.vscode.tab.tabTypes.kDailyReview
        );
        if (existing) {
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `k-daily-review-tab`,
                type: constants.vscode.tab.tabTypes.kDailyReview,
                data: null,
                data0: null,
                title: "Daily Review",
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }

    return { openKnowledgeTab, openNewKnowledgeTab, openGlobalDailyReviewTab };
}

