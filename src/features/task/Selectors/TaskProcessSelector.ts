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

    const progress = parsedProcess ? checklistProgress(parsedProcess) : null

    const allDone = parsedProcess ? isChecklistAllDone(parsedProcess) : false

    const nextRequiredIndex = (() => {
        if (!parsedProcess) return 0;
        const flat = getFlatItems(parsedProcess);
        for (let i = 0; i < flat.length; i++) {
            // Optional items never block sequential progress
            if (flat[i].isOptional) continue;
            if (!flat[i].isChecked && !flat[i].isSkipped) return i;
        }
        return flat.length;
    })()

    const lastCheckedName = (() => {
        if (!parsedProcess) return null;
        const flat = getFlatItems(parsedProcess);
        for (let i = flat.length - 1; i >= 0; i--) {
            if (flat[i].isChecked || flat[i].isSkipped) return flat[i].name;
        }
        return null;
    })()

    const nextPendingName = (() => {
        if (!parsedProcess) return null;
        const flat = getFlatItems(parsedProcess);
        return flat[nextRequiredIndex]?.name ?? null;
    })()

    return {
        progress,
        allDone,
        nextRequiredIndex,
        lastCheckedName,
        nextPendingName,
    };
};
