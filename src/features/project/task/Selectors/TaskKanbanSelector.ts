/**
 * Task Kanban Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import type { Task } from "@/features/taskDetail";
import { projectConstants } from "@/features/project/project.constants";
import { constants, useGetStandardRegistry } from "@/shared";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import {usePTaskStore} from "../../store/usePTask.store";

// ── Pure helpers ──────────────────────────────────────────────────────────────

type StatusOption = { code: string; label: string };

function groupTasksByStatus(filteredTasks: Task[], statusOptions: StatusOption[]): Record<string, Task[]> {
    const grouped: Record<string, Task[]> = {};
    statusOptions.forEach((status) => {
        grouped[status.code] = [];
    });
    filteredTasks.forEach((task) => {
        if (grouped[task.status]) {
            grouped[task.status].push(task);
        } else {
            // If status doesn't exist in options, fall back to the first column
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
}

// ── Selector ──────────────────────────────────────────────────────────────────

export const useTaskKanbanSelector = () => {
    const { tasks } = usePTaskStore();
    const { projectId } = useProjectDetailStore();

    const taskStatuses = useGetStandardRegistry("task_status");

    const statusOptions: StatusOption[] = taskStatuses
        .map((reg) => ({
            code: reg.code,
            label: reg.description || reg.code,
        }))
        .sort(
            (a, b) =>
                (projectConstants.optionOrder.taskStatuses[a.label] ?? 999) -
                (projectConstants.optionOrder.taskStatuses[b.label] ?? 999),
        );

    // Filter tasks by projectId, exclude deleted
    const filteredTasks = tasks.filter((task) => task.projectId === projectId && !task.deletedAt);

    // Group tasks by status
    const tasksByStatus = groupTasksByStatus(filteredTasks, statusOptions);

    return {
        statusOptions,
        filteredTasks,
        tasksByStatus,
    };
};
