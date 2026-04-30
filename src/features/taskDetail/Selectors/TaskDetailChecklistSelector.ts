/**
 * Task Detail Checklist Selector
 * Derived / computed values for checklist display.
 * No functions, no side effects — only useMemo.
 *
 * Depends on: useTaskDetailSelector (for selectedTask + registriesByType).
 */

import { useMemo } from "react";
import { useGeneralStore } from "@/shared";
import { useTaskDetailSelector } from "./TaskDetailSelector";
import {getChecklistTemplate, parseChecklistJson} from "../utils/checklist.utils";

export const useTaskDetailChecklistSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const { registriesByType } = useGeneralStore();

    const parsedChecklist = parseChecklistJson(selectedTask?.checklistJson ?? null)

    const checklistTemplate = getChecklistTemplate(selectedTask?.taskType ?? "personal", registriesByType)

    return {
        parsedChecklist,
        checklistTemplate,
    };
};
