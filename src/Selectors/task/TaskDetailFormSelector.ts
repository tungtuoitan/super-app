/**
 * Task Detail Form Selector
 * Derived / computed values for form autocomplete fields.
 * No functions, no side effects — only useMemo.
 */

import { useMemo } from "react";
import { useTaskStore } from "@/store/task/useTask.store";
import { IAutoCompleteOptions } from "@/shared/components";
import { useTaskDetailSelector } from "./TaskDetailSelector";

export const useTaskDetailFormSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const { projectOptions, parentTaskOptions } = useTaskStore();

    const currentProjectValue: IAutoCompleteOptions | null = useMemo(() => {
        const projectId = selectedTask?.projectId;
        if (!projectId) return null;
        return projectOptions.find((p) => p.id === projectId) ?? {
            id: projectId,
            label: `Project #${projectId}`,
            desc: `Project #${projectId}`,
            isActive: true,
        };
    }, [selectedTask?.projectId, projectOptions]);

    const currentParentTaskValue: IAutoCompleteOptions | null = useMemo(() => {
        const parentTaskId = selectedTask?.parentTaskId;
        if (!parentTaskId) return null;
        return parentTaskOptions.find((t) => t.id === parentTaskId) ?? {
            id: parentTaskId,
            label: `Task #${parentTaskId}`,
            desc: `Task #${parentTaskId}`,
            isActive: true,
        };
    }, [selectedTask?.parentTaskId, parentTaskOptions]);

    return {
        currentProjectValue,
        currentParentTaskValue,
    };
};
