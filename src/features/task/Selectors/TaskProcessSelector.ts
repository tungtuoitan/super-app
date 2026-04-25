/**
 * Task Process Selector
 * Derived / computed values for process UI display.
 * No functions, no side effects — only useMemo.
 *
 * Reads process data from useTaskDetailProcessSelector.
 */

import { useMemo } from "react";
import {
    isChecklistAllDone,
    checklistProgress,
    getFlatItems,
} from "@/utils/checklist.utils";
import { useTaskDetailProcessSelector } from "./TaskDetailProcessSelector";

export const useTaskProcessSelector = () => {
    const { parsedProcess } = useTaskDetailProcessSelector();

    const progress = useMemo(
        () => (parsedProcess ? checklistProgress(parsedProcess) : null),
        [parsedProcess],
    );

    const allDone = useMemo(
        () => (parsedProcess ? isChecklistAllDone(parsedProcess) : false),
        [parsedProcess],
    );

    const nextRequiredIndex = useMemo(() => {
        if (!parsedProcess) return 0;
        const flat = getFlatItems(parsedProcess);
        for (let i = 0; i < flat.length; i++) {
            // Optional items never block sequential progress
            if (flat[i].isOptional) continue;
            if (!flat[i].isChecked && !flat[i].isSkipped) return i;
        }
        return flat.length;
    }, [parsedProcess]);

    const lastCheckedName = useMemo(() => {
        if (!parsedProcess) return null;
        const flat = getFlatItems(parsedProcess);
        for (let i = flat.length - 1; i >= 0; i--) {
            if (flat[i].isChecked || flat[i].isSkipped) return flat[i].name;
        }
        return null;
    }, [parsedProcess]);

    const nextPendingName = useMemo(() => {
        if (!parsedProcess) return null;
        const flat = getFlatItems(parsedProcess);
        return flat[nextRequiredIndex]?.name ?? null;
    }, [parsedProcess, nextRequiredIndex]);

    return {
        progress,
        allDone,
        nextRequiredIndex,
        lastCheckedName,
        nextPendingName,
    };
};
