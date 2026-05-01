/**
 * Task Detail Checklist Selector
 * Derived / computed values for checklist display.
 * No functions, no side effects — only useMemo.
 *
 * Depends on: useTaskDetailSelector (for selectedTask + registriesByType).
 */

import { useGetStandardRegistry } from "@/shared";
import { useTaskDetailSelector } from "./TaskDetailSelector";
import {getChecklistTemplate, parseChecklistJson} from "../utils/checklist.utils";

export const useTaskDetailChecklistSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const taskTypes = useGetStandardRegistry("task_type");

    const parsedChecklist = parseChecklistJson(selectedTask?.checklistJson ?? null)

    const checklistTemplate = getChecklistTemplate(selectedTask?.taskType ?? "personal", taskTypes)

    return {
        parsedChecklist,
        checklistTemplate,
    };
};
