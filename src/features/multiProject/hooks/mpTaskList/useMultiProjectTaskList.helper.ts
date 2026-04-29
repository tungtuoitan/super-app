/**
 * Multi-Project Task List Helper
 * Callbacks only (useCallback). Handles inline updates, drag & drop, API calls.
 * Uses optimistic updates — local state updated immediately, API called in background.
 * Gets projectIds from useMultiTimelineStore — NO params.
 */

import type { Task } from "@/features/taskDetail";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useConsoleHelper } from "@/shell";
import { taskService, getSubtasksOutsideRange } from "@/features/taskDetail";
import { toLocalISOString } from "@/utils/date.utils";
import {useMultiProjectTaskGridHelper} from "./useMultiProjectTaskGrid.helper";
import {useAuthStore} from "@/shell";

export const useMultiProjectTaskListHelper = () => {
    const { tasks, setTasks } = useMpTaskStore();
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { $user } = useAuthStore();
    const { projectIds } = useMultiTimelineStore();
    const _console = useConsoleHelper();

    // Handle inline field update (status / priority) — optimistic
    const handleInlineUpdate = async (task: Task, field: "status" | "priority", newValue: string) => {
        if (task[field] === newValue) return;

        // Optimistic: update local state immediately
        setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, [field]: newValue } : t)),
        );

        try {
            const upsertData = {
                id: task.id,
                projectId: task.projectId,
                parentTaskId: task.parentTaskId,
                type: task.type,
                title: task.title,
                note: task.note,
                status: field === "status" ? newValue : task.status,
                priority: field === "priority" ? newValue : task.priority,
                startDate: toLocalISOString(task.startDate),
                endDate: toLocalISOString(task.endDate),
                orderIndex: task.orderIndex,
                folderWorkspaceItemId: task.folderWorkspaceItemId,
                checklistJson: task.checklistJson,
                processJson: task.processJson,
                customTabsJson: task.customTabsJson,
            };

            const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

            if (!result.success) {
                // Revert on failure
                setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? { ...t, [field]: task[field] } : t)),
                );
                _console.error("Failed to update task");
            }
        } catch (error) {
            // Revert on error
            setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? { ...t, [field]: task[field] } : t)),
            );
            console.error("Failed to update task:", error);
        }
    };

    // Handle inline date update — optimistic
    const handleInlineDateUpdate = async (task: Task, field: "startDate" | "endDate", newValue: Date | null) => {
        const currentValue = task[field];
        const isSame =
            (currentValue === null && newValue === null) ||
            (currentValue && newValue && currentValue.getTime() === newValue.getTime());
        if (isSame) return;

        // Check if this is a parent task and if any subtasks will fall outside the new range
        if (!task.parentTaskId) {
            const newStartDate = field === "startDate" ? newValue : (task.startDate ?? null);
            const newEndDate = field === "endDate" ? newValue : (task.endDate ?? null);
            const outsideSubtasks = getSubtasksOutsideRange(task, newStartDate, newEndDate, tasks);

            if (outsideSubtasks.length > 0) {
                _console.warning(
                    `Warning: ${outsideSubtasks.length} subtask(s) fall outside the new date range: ${outsideSubtasks.join(", ")}. Please update them manually.`,
                );
            }
        }

        // Optimistic: update local state immediately
        setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, [field]: newValue } : t)),
        );

        try {
            const upsertData = {
                id: task.id,
                projectId: task.projectId,
                parentTaskId: task.parentTaskId,
                type: task.type,
                title: task.title,
                note: task.note,
                status: task.status,
                priority: task.priority,
                startDate: field === "startDate" ? toLocalISOString(newValue) : toLocalISOString(task.startDate),
                endDate: field === "endDate" ? toLocalISOString(newValue) : toLocalISOString(task.endDate),
                orderIndex: task.orderIndex,
                folderWorkspaceItemId: task.folderWorkspaceItemId,
                checklistJson: task.checklistJson,
                processJson: task.processJson,
                customTabsJson: task.customTabsJson,
            };

            const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

            if (!result.success) {
                // Revert on failure
                setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? { ...t, [field]: currentValue } : t)),
                );
                _console.error("Failed to update task date");
            }
        } catch (error) {
            // Revert on error
            setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? { ...t, [field]: currentValue } : t)),
            );
            console.error("Failed to update task date:", error);
        }
    };

    // Handle drop task onto another task (make subtask) — needs reload for structure
    const handleDropTaskOntoTask = async (dragTask: Task, dropTask: Task, warningMessage?: string) => {
        // Optimistic: update parentTaskId locally
        setTasks((prev) =>
            prev.map((t) => (t.id === dragTask.id ? { ...t, parentTaskId: dropTask.id } : t)),
        );

        try {
            const upsertData = {
                id: dragTask.id,
                projectId: dragTask.projectId,
                parentTaskId: dropTask.id,
                type: dragTask.type,
                title: dragTask.title,
                note: dragTask.note,
                status: dragTask.status,
                priority: dragTask.priority,
                startDate: toLocalISOString(dragTask.startDate),
                endDate: toLocalISOString(dragTask.endDate),
                orderIndex: dragTask.orderIndex,
                folderWorkspaceItemId: dragTask.folderWorkspaceItemId,
                checklistJson: dragTask.checklistJson,
                processJson: dragTask.processJson,
                customTabsJson: dragTask.customTabsJson,
            };

            const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

            if (result.success) {
                _console.success(`Task "${dragTask.title || "Untitled"}" is now a subtask of "${dropTask.title || "Untitled"}"`);
                if (warningMessage) {
                    _console.warning(warningMessage);
                }
                // Reload to get updated parent/child limit dates from backend
                await loadTasksForProjects(projectIds);
            } else {
                // Revert
                setTasks((prev) =>
                    prev.map((t) => (t.id === dragTask.id ? { ...t, parentTaskId: dragTask.parentTaskId } : t)),
                );
                _console.error("Failed to make task a subtask");
            }
        } catch (error) {
            // Revert
            setTasks((prev) =>
                prev.map((t) => (t.id === dragTask.id ? { ...t, parentTaskId: dragTask.parentTaskId } : t)),
            );
            console.error("Failed to update task parent:", error);
            _console.error("Failed to make task a subtask");
        }
    };

    // Handle making a subtask independent (remove parent) — needs reload for structure
    const handleMakeIndependent = async (task: Task) => {
        const oldParentTaskId = task.parentTaskId;

        // Optimistic: remove parentTaskId locally
        setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, parentTaskId: null } : t)),
        );

        try {
            const upsertData = {
                id: task.id,
                projectId: task.projectId,
                parentTaskId: null,
                type: task.type,
                title: task.title,
                note: task.note,
                status: task.status,
                priority: task.priority,
                startDate: toLocalISOString(task.startDate),
                endDate: toLocalISOString(task.endDate),
                orderIndex: task.orderIndex,
                folderWorkspaceItemId: task.folderWorkspaceItemId,
                checklistJson: task.checklistJson,
                processJson: task.processJson,
                customTabsJson: task.customTabsJson,
            };

            const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

            if (result.success) {
                _console.success(`Task "${task.title || "Untitled"}" is now an independent task`);
                // Reload to get updated limit dates from backend
                await loadTasksForProjects(projectIds);
            } else {
                // Revert
                setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? { ...t, parentTaskId: oldParentTaskId } : t)),
                );
                _console.error("Failed to make task independent");
            }
        } catch (error) {
            // Revert
            setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? { ...t, parentTaskId: oldParentTaskId } : t)),
            );
            console.error("Failed to make task independent:", error);
            _console.error("Failed to make task independent");
        }
    };

    // Show error message
    const showDropError = (message: string) => {
        _console.error(message);
    };

    return {
        handleInlineUpdate,
        handleInlineDateUpdate,
        handleDropTaskOntoTask,
        handleMakeIndependent,
        showDropError,
    };
};
