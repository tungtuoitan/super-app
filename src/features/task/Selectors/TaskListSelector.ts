/**
 * Task List Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import { useMemo } from "react";
import { useTaskStore } from "../store/useTask.store";
import { useGeneralStore } from "@/store/General.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import { IStatusOption } from "@/shared/components";
import { getTaskStatusColors, getTaskPriorityColors } from "../utils/TaskDetail.utils";
import { sortTasksHierarchically } from "../utils/TaskGrid.utils";
import { constants } from "@/utils/constants";

export const useTaskListSelector = () => {
    const { tasks, taskSearchQuery } = useTaskStore();
    const { registriesByType } = useGeneralStore();
    const { projects } = useProjectStore();
    const { projectId } = useProjectDetailStore();

    // Get current project for date constraints
    const currentProject = useMemo(() => {
        return projects.find((p) => p.id === projectId);
    }, [projects, projectId]);

    // Get status options from registriesByType with colors
    const statusOptions: IStatusOption[] = useMemo(() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses
            .map((reg) => {
                const colors = getTaskStatusColors(reg.code);
                return {
                    id: reg.code,
                    code: reg.code,
                    label: reg.description || reg.code,
                    bgColor: colors.bg,
                    textColor: colors.text,
                };
            })
            .sort((a, b) => (constants.optionOrder.taskStatuses[a.label] ?? 999) - (constants.optionOrder.taskStatuses[b.label] ?? 999));
    }, [registriesByType]);

    // Get priority options from registriesByType with colors
    const priorityOptions: IStatusOption[] = useMemo(() => {
        const taskPriorities = registriesByType["task_priority"] || [];
        return taskPriorities
            .map((reg) => {
                const colors = getTaskPriorityColors(reg.code);
                return {
                    id: reg.code,
                    code: reg.code,
                    label: reg.description || reg.code,
                    bgColor: colors.bg,
                    textColor: colors.text,
                };
            })
            .sort((a, b) => (constants.optionOrder.taskPriorities[a.label] ?? 999) - (constants.optionOrder.taskPriorities[b.label] ?? 999));
    }, [registriesByType]);

    // Filter tasks by projectId and search query
    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task) => task.projectId === projectId);
        if (taskSearchQuery) {
            const query = taskSearchQuery.toLowerCase();
            result = result.filter(
                (task) =>
                    task.title?.toLowerCase().includes(query) ||
                    String(task.id).includes(query),
            );
        }
        return result;
    }, [tasks, projectId, taskSearchQuery]);

    // Sort tasks: parent tasks first, then subtasks immediately after their parent
    const sortedTasks = useMemo(() => {
        return sortTasksHierarchically(filteredTasks);
    }, [filteredTasks]);

    return {
        currentProject,
        statusOptions,
        priorityOptions,
        filteredTasks,
        sortedTasks,
    };
};
