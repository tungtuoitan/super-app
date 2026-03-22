/**
 * Task Checklist Selector
 * Derived / computed values for checklist UI display.
 * No functions, no side effects — only useMemo.
 *
 * Reads checklist data from useTaskDetailChecklistSelector (parent-level selector).
 * Environment-aware: uses activeEnv from store when checklistType === "testcase".
 */

import { useMemo } from "react";
import {
    isChecklistAllDone,
    checklistProgress,
    getFlatItems,
    getItemCheckState,
} from "@/utils/checklist.utils";
import { useTaskDetailChecklistSelector } from "./TaskDetailChecklistSelector";
import { useTaskChecklistStore } from "@/store/task/useTaskChecklist.store";

export const useTaskChecklistSelector = () => {
    const { parsedChecklist } = useTaskDetailChecklistSelector();
    const { activeEnv } = useTaskChecklistStore();

    /** Active env — only passed to utils when testcase */
    const env = parsedChecklist?.checklistType === "testcase" ? activeEnv : undefined;

    const progress = useMemo(
        () => (parsedChecklist ? checklistProgress(parsedChecklist, env) : null),
        [parsedChecklist, env],
    );

    const allDone = useMemo(
        () => (parsedChecklist ? isChecklistAllDone(parsedChecklist, env) : false),
        [parsedChecklist, env],
    );

    const nextRequiredIndex = useMemo(() => {
        if (!parsedChecklist) return 0;
        const flat = getFlatItems(parsedChecklist);
        for (let i = 0; i < flat.length; i++) {
            // Optional items never block sequential progress
            if (flat[i].isOptional) continue;
            const s = getItemCheckState(flat[i], env);
            if (!s.isChecked && !s.isSkipped) return i;
        }
        return flat.length;
    }, [parsedChecklist, env]);

    const lastCheckedName = useMemo(() => {
        if (!parsedChecklist) return null;
        const flat = getFlatItems(parsedChecklist);
        for (let i = flat.length - 1; i >= 0; i--) {
            const s = getItemCheckState(flat[i], env);
            if (s.isChecked || s.isSkipped) return flat[i].name;
        }
        return null;
    }, [parsedChecklist, env]);

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
