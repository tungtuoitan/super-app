/**
 * Multi-Project Kanban Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import { useMemo } from "react";
import { Task, useTaskStore } from "@/features/task/store/useTask.store";
import { useGeneralStore } from "@/store/General.store";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { constants } from "@/utils/constants";

export const useMultiProjectKanbanSelector = () => {
    const { tasks } = useTaskStore();
    const { registriesByType } = useGeneralStore();
    const { projectIds } = useMultiTimelineStore();

    // Get status options from registriesByType
    const statusOptions = useMemo(() => {
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
    }, [registriesByType]);

    // Filter tasks by projectIds, exclude deleted
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => projectIds.includes(task.projectId) && !task.deletedAt);
    }, [tasks, projectIds]);

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        statusOptions.forEach((status) => {
            grouped[status.code] = [];
        });
        filteredTasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            } else {
                const firstStatus = statusOptions[0]?.code;
                if (firstStatus && grouped[firstStatus]) {
                    grouped[firstStatus].push(task);
                }
            }
        });
        Object.keys(grouped).forEach((status) => {
            grouped[status].sort((a, b) => a.orderIndex - b.orderIndex);
        });
        return grouped;
    }, [filteredTasks, statusOptions]);

    return {
        statusOptions,
        filteredTasks,
        tasksByStatus,
    };
};
