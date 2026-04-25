/**
 * Task Detail Checklist Selector
 * Derived / computed values for checklist display.
 * No functions, no side effects — only useMemo.
 *
 * Depends on: useTaskDetailSelector (for selectedTask + registriesByType).
 */

import { useMemo } from "react";
import { useGeneralStore } from "@/store/General.store";
import { parseChecklistJson, getChecklistTemplate } from "@/utils/checklist.utils";
import { useTaskDetailSelector } from "./TaskDetailSelector";

export const useTaskDetailChecklistSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const { registriesByType } = useGeneralStore();

    const parsedChecklist = useMemo(
        () => parseChecklistJson(selectedTask?.checklistJson ?? null),
        [selectedTask?.checklistJson],
    );

    const checklistTemplate = useMemo(
        () => getChecklistTemplate(selectedTask?.taskType ?? "personal", registriesByType),
        [selectedTask?.taskType, registriesByType],
    );

    return {
        parsedChecklist,
        checklistTemplate,
    };
};
