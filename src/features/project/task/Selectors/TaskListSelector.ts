/**
 * Task List Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import { useGeneralStore } from "@/shared/store/General.store";
import { IStatusOption } from "@/shared/components";
import { getTaskStatusColors, getTaskPriorityColors, sortTasksHierarchically } from "@/features/taskDetail";
import { constants } from "@/utils/constants";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import {usePTaskStore} from "../../store/usePTask.store";

export const useTaskListSelector = () => {
    const { tasks, taskSearchQuery } = usePTaskStore();
    const { registriesByType } = useGeneralStore();
    const { projectId } = useProjectDetailStore();
    const { projects } = useProjectStore();

    // Get current project for date constraints
    const currentProject = projects.find((p) => p.id === projectId)

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
    })()

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

    // Filter tasks by projectId and search query
    const filteredTasks = (() => {
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
    })()

    // Sort tasks: parent tasks first, then subtasks immediately after their parent
    const sortedTasks = sortTasksHierarchically(filteredTasks)

    return {
        currentProject,
        statusOptions,
        priorityOptions,
        filteredTasks,
        sortedTasks,
    };
};
