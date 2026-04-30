/**
 * Multi-Project Kanban Helper
 * Callbacks only (useCallback). Handles status transition validation and drag-drop API calls.
 * Uses optimistic updates — local state updated immediately, API called in background.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useConsoleHelper } from "@/shared";
import { taskService } from "@/features/taskDetail";
import { toLocalISOString } from "@/shared";
import { useMultiProjectKanbanSelector } from "../../Selectors/useMultiProjectKanban.selector";
import {useAuthStore} from "@/shared";

export const useMultiProjectKanbanHelper = () => {
    const { tasks, setTasks } = useMpTaskStore();
    const { $user } = useAuthStore();
    const { projectIds } = useMultiTimelineStore();
    const _console = useConsoleHelper();

    // Call selector directly
    const { filteredTasks } = useMultiProjectKanbanSelector();

    /**
     * Check if a task can be dropped to a target status column.
     */
    const canDropToColumn = (taskId: number, targetStatus: string): boolean => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task) return false;

            if (task.status === "cancelled" && targetStatus === "completed") return false;
            if (task.status === "completed" && (targetStatus === "cancelled" || targetStatus === "onhold")) return false;
            if (task.status === "failed") return false;
            if (targetStatus === "failed") return false;

            if (targetStatus === "completed") {
                const subtasks = filteredTasks.filter((t) => t.parentTaskId === task.id);
                const hasActiveSubtasks = subtasks.some((s) =>
                    ["open", "inprogress", "onhold"].includes(s.status),
                );
                if (hasActiveSubtasks) return false;
            }

            return true;
        };

    /**
     * Handle drop task to new column with cascade status changes for subtasks.
     * Uses optimistic update — UI updates immediately, API call in background.
     */
    const handleDropTask = async (taskId: number, newStatus: string) => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.status === newStatus) return;

            const subtasks = filteredTasks.filter((t) => t.parentTaskId === task.id);

            // Build cascade status changes for subtasks
            const subtaskUpdates: { id: number; oldStatus: string; newStatus: string }[] = [];
            subtasks.forEach((subtask) => {
                let newSubtaskStatus: string | null = null;

                if (newStatus === "onhold" && ["open", "inprogress"].includes(subtask.status)) {
                    newSubtaskStatus = "onhold";
                } else if (newStatus === "cancelled" && ["open", "inprogress", "onhold"].includes(subtask.status)) {
                    newSubtaskStatus = "cancelled";
                } else if (task.status === "inprogress" && newStatus === "open" && subtask.status === "inprogress") {
                    newSubtaskStatus = "open";
                }

                if (newSubtaskStatus && newSubtaskStatus !== subtask.status) {
                    subtaskUpdates.push({ id: subtask.id, oldStatus: subtask.status, newStatus: newSubtaskStatus });
                }
            });

            // Optimistic: update local state immediately
            const oldStatus = task.status;
            setTasks((prev) =>
                prev.map((t) => {
                    if (t.id === task.id) return { ...t, status: newStatus };
                    const subtaskUpdate = subtaskUpdates.find((u) => u.id === t.id);
                    if (subtaskUpdate) return { ...t, status: subtaskUpdate.newStatus };
                    return t;
                }),
            );

            try {
                const batchRequests: any[] = [];

                batchRequests.push({
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: newStatus,
                    priority: task.priority,
                    startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson,
                    processJson: task.processJson,
                    customTabsJson: task.customTabsJson,
                });

                subtaskUpdates.forEach((update) => {
                    const subtask = subtasks.find((s) => s.id === update.id)!;
                    batchRequests.push({
                        id: subtask.id,
                        projectId: subtask.projectId,
                        parentTaskId: subtask.parentTaskId,
                        type: subtask.type,
                        title: subtask.title,
                        note: subtask.note,
                        status: update.newStatus,
                        priority: subtask.priority,
                        startDate: toLocalISOString(subtask.startDate),
                        endDate: toLocalISOString(subtask.endDate),
                        orderIndex: subtask.orderIndex,
                        folderWorkspaceItemId: subtask.folderWorkspaceItemId,
                        checklistJson: subtask.checklistJson,
                        processJson: subtask.processJson,
                        customTabsJson: subtask.customTabsJson,
                    });
                });

                const result = await taskService._upsertTaskBatch($user.userToken, batchRequests);

                if (!result.success) {
                    // Revert all changes on failure
                    setTasks((prev) =>
                        prev.map((t) => {
                            if (t.id === task.id) return { ...t, status: oldStatus };
                            const subtaskUpdate = subtaskUpdates.find((u) => u.id === t.id);
                            if (subtaskUpdate) return { ...t, status: subtaskUpdate.oldStatus };
                            return t;
                        }),
                    );
                    _console.error("Failed to update task status");
                }
            } catch (error) {
                // Revert all changes on error
                setTasks((prev) =>
                    prev.map((t) => {
                        if (t.id === task.id) return { ...t, status: oldStatus };
                        const subtaskUpdate = subtaskUpdates.find((u) => u.id === t.id);
                        if (subtaskUpdate) return { ...t, status: subtaskUpdate.oldStatus };
                        return t;
                    }),
                );
                console.error("Failed to update task status:", error);
            }
        };

    return {
        canDropToColumn,
        handleDropTask,
    };
};
