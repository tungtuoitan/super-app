/**
 * Task Grid Update Helper
 * Optimistic update callbacks for inline edits and drag & drop.
 * Uses optimistic updates — local state updated immediately, API called in background.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import type { Task } from "@/features/taskDetail";
import { usePTaskStore } from "../../store/usePTask.store";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { taskService, getSubtasksOutsideRange } from "@/features/taskDetail";
import { toLocalISOString } from "@/utils/date.utils";
import { useTaskGridHelper } from "./useTaskGrid.helper";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import {useAuthStore} from "@/shell/store/Auth.store";

export const useTaskGridUpdateHelper = () => {
    const { tasks, setTasks } = usePTaskStore();
    const { loadTasks } = useTaskGridHelper();
    const { $user } = useAuthStore();
    const { projectId } = useProjectDetailStore();
    const _console = useConsoleHelper();

    const handleInlineUpdate =
        async (task: Task, field: "status" | "priority", newValue: string) => {
            if (task[field] === newValue) return;

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
                    setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, [field]: task[field] } : t)),
                    );
                    _console.error("Failed to update task");
                }
            } catch (error) {
                setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? { ...t, [field]: task[field] } : t)),
                );
                console.error("Failed to update task:", error);
            }
        }

    const handleInlineDateUpdate =
        async (task: Task, field: "startDate" | "endDate", newValue: Date | null) => {
            const currentValue = task[field];
            const isSame =
                (currentValue === null && newValue === null) ||
                (currentValue && newValue && currentValue.getTime() === newValue.getTime());
            if (isSame) return;

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
                    setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, [field]: currentValue } : t)),
                    );
                    _console.error("Failed to update task date");
                }
            } catch (error) {
                setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? { ...t, [field]: currentValue } : t)),
                );
                console.error("Failed to update task date:", error);
            }
        }

    const handleDropTaskOntoTask =
        async (dragTask: Task, dropTask: Task, warningMessage?: string) => {
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
                    await loadTasks(projectId ?? undefined);
                } else {
                    setTasks((prev) =>
                        prev.map((t) => (t.id === dragTask.id ? { ...t, parentTaskId: dragTask.parentTaskId } : t)),
                    );
                    _console.error("Failed to make task a subtask");
                }
            } catch (error) {
                setTasks((prev) =>
                    prev.map((t) => (t.id === dragTask.id ? { ...t, parentTaskId: dragTask.parentTaskId } : t)),
                );
                console.error("Failed to update task parent:", error);
                _console.error("Failed to make task a subtask");
            }
        }

    const handleMakeIndependent =
        async (task: Task) => {
            const oldParentTaskId = task.parentTaskId;

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
                    await loadTasks(projectId ?? undefined);
                } else {
                    setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, parentTaskId: oldParentTaskId } : t)),
                    );
                    _console.error("Failed to make task independent");
                }
            } catch (error) {
                setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? { ...t, parentTaskId: oldParentTaskId } : t)),
                );
                console.error("Failed to make task independent:", error);
                _console.error("Failed to make task independent");
            }
        }

    const showDropError =
        (message: string) => {
            _console.error(message);
        }

    return {
        handleInlineUpdate,
        handleInlineDateUpdate,
        handleDropTaskOntoTask,
        handleMakeIndependent,
        showDropError,
    };
};
