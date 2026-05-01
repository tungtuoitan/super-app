/**
 * Task Kanban Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore â€” NO params.
 */

import type { Task } from "@/features/taskDetail";
import { projectConstants } from "@/features/project/project.constants";
import { constants, useGetStandardRegistry } from "@/shared";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import {usePTaskStore} from "../../store/usePTask.store";

export const useTaskKanbanSelector = () => {
    const { tasks } = usePTaskStore();
    const { projectId } = useProjectDetailStore();

    const taskStatuses = useGetStandardRegistry("task_status");
    // Get status options from registriesByType
    const statusOptions = (() => {
        return taskStatuses
            .map((reg:any) => ({
                code: reg.code,
                label: reg.description || reg.code,
            }))
            .sort(
                (a:any, b:any) =>
                    (projectConstants.optionOrder.taskStatuses[a.label] ?? 999) -
                    (projectConstants.optionOrder.taskStatuses[b.label] ?? 999),
            );
    })();

    // Filter tasks by projectId, exclude deleted
    const filteredTasks = tasks.filter((task:any) => task.projectId === projectId && !task.deletedAt);

    // Group tasks by status
    const tasksByStatus = (() => {
        const grouped: Record<string, Task[]> = {};
        statusOptions.forEach((status:any) => {
            grouped[status.code] = [];
        });
        filteredTasks.forEach((task:any) => {
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


