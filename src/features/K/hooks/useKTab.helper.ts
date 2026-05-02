/**
 * KTab Helper Hook
 * Opens knowledge editor tabs (create new / edit existing).
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import type { KWsResponse } from "../types/K.types";
import { useKStore } from "../store/K.store";

const K_TAB_TYPE           = shellConstants.vscode.tab.tabTypes.kKnowledge;
const DAILY_REVIEW_TAB_TYPE = shellConstants.vscode.tab.tabTypes.kDailyReview;

export function useKTabHelper() {
    const { openSingletonTab } = useEditorTabBarHelper();
    const { setAllK } = useKStore();

    /** Open existing knowledge in the singleton knowledge tab. */
    const openKnowledgeTab = (knowledge: KWsResponse) => {
        openSingletonTab(K_TAB_TYPE, { title: knowledge.name || "Knowledge" }, knowledge);
    };

    /** Create a temp knowledge (negative ID), push to store, open singleton tab. */
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
        openSingletonTab(
            K_TAB_TYPE,
            { title: "New Knowledge", hasUnsavedChanges: true },
            tempKnowledge,
        );
    };

    /** Open the global daily review singleton tab. */
    const openGlobalDailyReviewTab = () => {
        openSingletonTab(
            DAILY_REVIEW_TAB_TYPE,
            { title: "Daily Review", tabId: "k-daily-review-tab" },
        );
    };

    return { openKnowledgeTab, openNewKnowledgeTab, openGlobalDailyReviewTab };
}
