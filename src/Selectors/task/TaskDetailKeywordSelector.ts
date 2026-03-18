/**
 * Task Detail Keyword Selector
 * Derived / computed values for linked keywords display.
 * No functions, no side effects — only useMemo.
 */

import { useMemo } from "react";
import { useTaskStore } from "@/store/task/useTask.store";

const KEYWORD_TYPE_ORDER: Record<string, number> = {
    workspace: 0, folder: 1, note: 2, file: 3,
    h1: 4, h2: 4, h3: 4, h4: 4, h5: 4, h6: 4, external: 5,
};

export const useTaskDetailKeywordSelector = () => {
    const { linkedKeywords } = useTaskStore();

    const sortedLinkedKeywords = useMemo(
        () => [...linkedKeywords].sort((a, b) => (KEYWORD_TYPE_ORDER[a.type] ?? 6) - (KEYWORD_TYPE_ORDER[b.type] ?? 6)),
        [linkedKeywords],
    );

    return {
        sortedLinkedKeywords,
    };
};
