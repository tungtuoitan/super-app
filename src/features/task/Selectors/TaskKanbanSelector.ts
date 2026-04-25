import { useCurrentProjectStore } from "@/store/useCurrentProject.store";
/**
 * Task Kanban Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import { useMemo } from "react";
import { Task, useTaskStore } from "../store/useTask.store";
import { useGeneralStore } from "@/store/General.store";
import { constants } from "@/utils/constants";

export const useTaskKanbanSelector = () => {
    const { tasks } = useTaskStore();
    const { registriesByType } = useGeneralStore();
    const { projectId } = useCurrentProjectStore();

    // Get status options from registriesByType
    const statusOptions = (() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses
            .map((reg) => ({
                code: reg.code,
                label: reg.description || reg.code,
            }))
            .sort(
                (a, b) =>
                    (constants.optionOrder.taskStatuses[a.label] ?? 999) -
                    (constants.optionOrder.taskStatuses[b.label] ?? 999),
            );
    })();

    // Filter tasks by projectId, exclude deleted
    const filteredTasks = tasks.filter((task) => task.projectId === projectId && !task.deletedAt);

    // Group tasks by status
    const tasksByStatus = (() => {
        const grouped: Record<string, Task[]> = {};
        statusOptions.forEach((status) => {
            grouped[status.code] = [];
        });
        filteredTasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            } else {
                // If status doesn't exist in options, add to first column
                const firstStatus = statusOptions[0]?.code;
                if (firstStatus && grouped[firstStatus]) {
                    grouped[firstStatus].push(task);
                }
            }
        });
        // Sort tasks within each column by orderIndex
        Object.keys(grouped).forEach((status) => {
            grouped[status].sort((a, b) => a.orderIndex - b.orderIndex);
        });
        return grouped;
    })()

    return {
        statusOptions,
        filteredTasks,
        tasksByStatus,
    };
};
