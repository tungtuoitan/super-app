/**
 * Multi-Project Task List Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import { useMemo } from "react";
import { useTaskStore } from "@/features/task/store/useTask.store";
import { useGeneralStore } from "@/store/General.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { IStatusOption } from "@/shared/components";
import { getTaskStatusColors, getTaskPriorityColors } from "@/features/task/utils/TaskDetail.utils";
import { sortTasksHierarchically } from "@/features/task/utils/TaskGrid.utils";
import { constants } from "@/utils/constants";

export const useMultiProjectTaskListSelector = () => {
    const { tasks, taskSearchQuery } = useTaskStore();
    const { registriesByType } = useGeneralStore();
    const { projects } = useProjectStore();
    const { projectIds } = useMultiTimelineStore();

    // Create a map of projectId -> projectName for display
    const projectNameMap = (() => {
        const map: Record<number, string> = {};
        projects
            .filter((p) => projectIds.includes(p.id))
            .forEach((p) => {
                map[p.id] = p.name;
            });
        return map;
    })();

    // Get status options from registriesByType with colors
    const statusOptions: IStatusOption[] = (() => {
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
    })();

    // Get priority options from registriesByType with colors
    const priorityOptions: IStatusOption[] = (() => {
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
    })()

    // Filter tasks by projectIds and search query
    const filteredTasks = (() => {
        let result = tasks.filter((task) => projectIds.includes(task.projectId));
        if (taskSearchQuery) {
            const query = taskSearchQuery.toLowerCase();
            result = result.filter(
                (task) =>
                    task.title?.toLowerCase().includes(query) ||
                    String(task.id).includes(query),
            );
        }
        return result;
    })()

    // Sort tasks hierarchically
    const sortedTasks = sortTasksHierarchically(filteredTasks);

    return {
        projectNameMap,
        statusOptions,
        priorityOptions,
        filteredTasks,
        sortedTasks,
    };
};
