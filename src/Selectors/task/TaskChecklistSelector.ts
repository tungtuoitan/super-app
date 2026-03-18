/**
 * Task Checklist Selector
 * Derived / computed values for checklist UI display.
 * No functions, no side effects — only useMemo.
 *
 * Reads checklist data from useTaskDetailChecklistSelector (parent-level selector).
 */

import { useMemo } from "react";
import {
    isChecklistAllDone,
    checklistProgress,
    getFlatItems,
} from "@/utils/checklist.utils";
import { useTaskDetailChecklistSelector } from "./TaskDetailChecklistSelector";

export const useTaskChecklistSelector = () => {
    const { parsedChecklist } = useTaskDetailChecklistSelector();

    const progress = useMemo(
        () => (parsedChecklist ? checklistProgress(parsedChecklist) : null),
        [parsedChecklist],
    );

    const allDone = useMemo(
        () => (parsedChecklist ? isChecklistAllDone(parsedChecklist) : false),
        [parsedChecklist],
    );

    const nextRequiredIndex = useMemo(() => {
        if (!parsedChecklist) return 0;
        const flat = getFlatItems(parsedChecklist);
        for (let i = 0; i < flat.length; i++) {
            if (!flat[i].isChecked && !flat[i].isSkipped) return i;
        }
        return flat.length;
    }, [parsedChecklist]);

    const lastCheckedName = useMemo(() => {
        if (!parsedChecklist) return null;
        const flat = getFlatItems(parsedChecklist);
        for (let i = flat.length - 1; i >= 0; i--) {
            if (flat[i].isChecked || flat[i].isSkipped) return flat[i].name;
        }
        return null;
    }, [parsedChecklist]);

    const nextPendingName = useMemo(() => {
        if (!parsedChecklist) return null;
        const flat = getFlatItems(parsedChecklist);
        return flat[nextRequiredIndex]?.name ?? null;
    }, [parsedChecklist, nextRequiredIndex]);

    return {
        // Only derived values — no pass-through from parent selectors
        progress,
        allDone,
        nextRequiredIndex,
        lastCheckedName,
        nextPendingName,
    };
};
