/**
 * Task Detail Process Selector
 * Derived / computed values for process display.
 * No functions, no side effects — only useMemo.
 *
 * Depends on: useTaskDetailSelector (for selectedTask).
 */

import { useMemo } from "react";
import { parseChecklistJson } from "@/utils/checklist.utils";
import { useTaskDetailSelector } from "./TaskDetailSelector";

export const useTaskDetailProcessSelector = () => {
    const { selectedTask } = useTaskDetailSelector();

    const parsedProcess = parseChecklistJson(selectedTask?.processJson ?? null)

    return {
        parsedProcess,
    };
};
