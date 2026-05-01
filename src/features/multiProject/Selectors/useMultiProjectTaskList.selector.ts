/**
 * Multi-Project Task List Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import { useMemo } from "react";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useProjectStore } from "@/features/project";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { IStatusOption, useGetStandardRegistry } from "@/shared";
import { getTaskStatusColors, getTaskPriorityColors, sortTasksHierarchically } from "@/features/taskDetail";
import { constants } from "@/shared";

export const useMultiProjectTaskListSelector = () => {
    const { tasks, taskSearchQuery } = useMpTaskStore();
    const { projects } = useProjectStore();
    const { projectIds } = useMultiTimelineStore();

    // Create a map of projectId -> projectName for display
    const projectNameMap = useMemo(() => {
        const map: Record<number, string> = {};
        projects
            .filter((p) => projectIds.includes(p.id))
            .forEach((p) => {
                map[p.id] = p.name;
            });
        return map;
    }, [projects, projectIds]);

    const taskStatuses = useGetStandardRegistry("task_status")
    // Get status options from registriesByType with colors
    const statusOptions: IStatusOption[] = useMemo(() => {
        return taskStatuses
            .map((reg:any) => {
                const colors = getTaskStatusColors(reg.code);
                return {
                    id: reg.code,
                    code: reg.code,
                    label: reg.description || reg.code,
                    bgColor: colors.bg,
                    textColor: colors.text,
                };
            })
            .sort((a:any, b:any) => (constants.optionOrder.taskStatuses[a.label] ?? 999) - (constants.optionOrder.taskStatuses[b.label] ?? 999));
    }, [taskStatuses]);

    const taskPriorities = useGetStandardRegistry("task_priority") || [];
    // Get priority options from registriesByType with colors
    const priorityOptions: IStatusOption[] = useMemo(() => {
        return taskPriorities
            .map((reg:any) => {
                const colors = getTaskPriorityColors(reg.code);
                return {
                    id: reg.code,
                    code: reg.code,
                    label: reg.description || reg.code,
                    bgColor: colors.bg,
                    textColor: colors.text,
                };
            })
            .sort((a:any, b:any) => (constants.optionOrder.taskPriorities[a.label] ?? 999) - (constants.optionOrder.taskPriorities[b.label] ?? 999));
    }, [taskPriorities]);

    // Filter tasks by projectIds and search query
    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task:any) => projectIds.includes(task.projectId));
        if (taskSearchQuery) {
            const query = taskSearchQuery.toLowerCase();
            result = result.filter(
                (task) =>
                    task.title?.toLowerCase().includes(query) ||
                    String(task.id).includes(query),
            );
        }
        return result;
    }, [tasks, projectIds, taskSearchQuery]);

    // Sort tasks hierarchically
    const sortedTasks = useMemo(() => {
        return sortTasksHierarchically(filteredTasks);
    }, [filteredTasks]);

    return {
        projectNameMap,
        statusOptions,
        priorityOptions,
        filteredTasks,
        sortedTasks,
    };
};
