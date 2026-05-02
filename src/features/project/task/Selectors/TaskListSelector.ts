/**
 * Task List Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import { useMemo } from "react";
import { IStatusOption, useGetStandardRegistry } from "@/shared";
import { projectConstants } from "@/features/project/project.constants";
import { getTaskStatusColors, getTaskPriorityColors, sortTasksHierarchically } from "@/features/taskDetail";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import {usePTaskStore} from "../../store/usePTask.store";

export const useTaskListSelector = () => {
    const { tasks, taskSearchQuery } = usePTaskStore();
    const { projectId } = useProjectDetailStore();
    const { projects } = useProjectStore();

    // Get current project for date constraints
    const currentProject = useMemo(
        () => projects.find((p) => p.id === projectId),
        [projects, projectId],
    );

    // Get status options from registriesByType with colors
    const taskStatuses = useGetStandardRegistry("task_status") || [];
    const statusOptions: IStatusOption[] = useMemo(
        () =>
            taskStatuses
                .map((reg: any) => {
                    const colors = getTaskStatusColors(reg.code);
                    return {
                        id: reg.code,
                        code: reg.code,
                        label: reg.description || reg.code,
                        bgColor: colors.bg,
                        textColor: colors.text,
                    };
                })
                .sort(
                    (a: any, b: any) =>
                        (projectConstants.optionOrder.taskStatuses[a.label] ?? 999) -
                        (projectConstants.optionOrder.taskStatuses[b.label] ?? 999),
                ),
        [taskStatuses],
    );

    // Get priority options from registriesByType with colors
    const taskPriorities = useGetStandardRegistry("task_priority") || [];
    const priorityOptions: IStatusOption[] = useMemo(
        () =>
            taskPriorities
                .map((reg: any) => {
                    const colors = getTaskPriorityColors(reg.code);
                    return {
                        id: reg.code,
                        code: reg.code,
                        label: reg.description || reg.code,
                        bgColor: colors.bg,
                        textColor: colors.text,
                    };
                })
                .sort(
                    (a: any, b: any) =>
                        (projectConstants.optionOrder.taskPriorities[a.label] ?? 999) -
                        (projectConstants.optionOrder.taskPriorities[b.label] ?? 999),
                ),
        [taskPriorities],
    );

    // Filter tasks by projectId and search query
    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task: any) => task.projectId === projectId);
        if (taskSearchQuery) {
            const query = taskSearchQuery.toLowerCase();
            result = result.filter(
                (task: any) =>
                    task.title?.toLowerCase().includes(query) ||
                    String(task.id).includes(query),
            );
        }
        return result;
    }, [tasks, projectId, taskSearchQuery]);

    // Sort tasks: parent tasks first, then subtasks immediately after their parent
    const sortedTasks = useMemo(
        () => sortTasksHierarchically(filteredTasks),
        [filteredTasks],
    );

    return {
        currentProject,
        statusOptions,
        priorityOptions,
        filteredTasks,
        sortedTasks,
    };
};
