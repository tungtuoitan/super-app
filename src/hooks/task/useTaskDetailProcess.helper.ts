/**
 * Task Detail Process Helper
 * Handles process state changes and server persistence.
 * Mirrors useTaskDetailChecklist.helper — same pattern, uses processJson field.
 */

import { useCallback } from "react";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { taskService } from "@/services/task.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { ChecklistJSON, isChecklistAllDone } from "@/utils/checklist.utils";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";

export const useTaskDetailProcessHelper = () => {
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { setTasks } = useTaskStore();
    const { selectedTask } = useTaskDetailSelector();

    /** Persist processJson to server — auto-completes task when all steps done */
    const saveProcessToServer = useCallback(
        async (json: ChecklistJSON, task: Task) => {
            if (task.id <= 0 || !$user.userToken) return;
            const allDone = isChecklistAllDone(json);
            const newStatus = allDone ? "completed" : (task.status === "completed" ? "in_progress" : task.status);
            const newProcessJson = JSON.stringify(json);

            await taskService._patchTask($user.userToken, task.id, {
                processJson: newProcessJson,
                status: newStatus,
            });

            // Update tab — clear unsaved flag + sync status
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...(t.data as Task), processJson: newProcessJson, status: newStatus },
                              data0: { ...(t.data as Task), processJson: newProcessJson, status: newStatus },
                              hasUnsavedChanges: false,
                          }
                        : t,
                ),
            );

            // Sync tasks store so grid reflects new status
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === task.id ? { ...t, processJson: newProcessJson, status: newStatus } : t,
                ),
            );
        },
        [$user.userToken, activeTabId, setOpenTabs, setTasks],
    );

    /** Item toggled in view mode → optimistic local update + immediate server save */
    const handleProcessChange = useCallback(
        (updated: ChecklistJSON) => {
            if (!selectedTask) return;
            const newJson = JSON.stringify(updated);
            const isNewTask = selectedTask.id <= 0;
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...(t.data as Task), processJson: newJson },
                              hasUnsavedChanges: isNewTask,
                          }
                        : t,
                ),
            );
            if (!isNewTask) {
                saveProcessToServer(updated, { ...selectedTask, processJson: newJson });
            }
        },
        [selectedTask, activeTabId, setOpenTabs, saveProcessToServer],
    );

    /** Process saved from edit mode */
    const handleProcessSave = useCallback(
        (json: ChecklistJSON) => {
            if (selectedTask) handleProcessChange(json);
        },
        [selectedTask, handleProcessChange],
    );

    return {
        saveProcessToServer,
        handleProcessChange,
        handleProcessSave,
    };
};
