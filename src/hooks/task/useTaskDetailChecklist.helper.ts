/**
 * Task Detail Checklist Helper
 * Handles checklist state changes, server persistence, and template management
 */

import { useCallback } from "react";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { taskService } from "@/services/task.service";
import { standardRegistryService } from "@/services/standardRegistry.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { ChecklistJSON } from "@/types/task/checklist.types";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";

export const useTaskDetailChecklistHelper = () => {
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { setTasks } = useTaskStore();
    const { selectedTask } = useTaskDetailSelector();

    /** Persist checklistJson to server immediately (no auto-complete — only process controls completion) */
    const saveChecklistToServer = useCallback(
        async (json: ChecklistJSON, task: Task) => {
            if (task.id <= 0 || !$user.userToken) return;
            const newChecklistJson = JSON.stringify(json);

            await taskService._patchTask($user.userToken, task.id, {
                checklistJson: newChecklistJson,
            });

            // Update tab — clear unsaved flag
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...(t.data as Task), checklistJson: newChecklistJson },
                              data0: { ...(t.data as Task), checklistJson: newChecklistJson },
                              hasUnsavedChanges: false,
                          }
                        : t,
                ),
            );
        },
        [$user.userToken, activeTabId, setOpenTabs, setTasks],
    );

    /** Item toggled in view mode → optimistic local update + immediate server save */
    const handleChecklistChange = useCallback(
        (updated: ChecklistJSON) => {
            if (!selectedTask) return;
            const newJson = JSON.stringify(updated);
            const isNewTask = selectedTask.id <= 0;
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...(t.data as Task), checklistJson: newJson },
                              hasUnsavedChanges: isNewTask,
                          }
                        : t,
                ),
            );
            // For new tasks the checklist is saved together with the task itself
            if (!isNewTask) {
                saveChecklistToServer(updated, { ...selectedTask, checklistJson: newJson });
            }
        },
        [selectedTask, activeTabId, setOpenTabs, saveChecklistToServer],
    );

    /** Checklist saved from edit mode */
    const handleChecklistSave = useCallback(
        (json: ChecklistJSON) => {
            if (selectedTask) handleChecklistChange(json);
        },
        [selectedTask, handleChecklistChange],
    );

    /** Save current checklist as the default template for the task's type */
    const persistDefaultTemplate = useCallback(
        async (templateText: string) => {
            if (!selectedTask?.taskType || !$user.userToken) return;
            await standardRegistryService._setChecklistTemplate(
                $user.userToken,
                selectedTask.taskType,
                templateText,
            );
        },
        [selectedTask?.taskType, $user.userToken],
    );

    return {
        saveChecklistToServer,
        handleChecklistChange,
        handleChecklistSave,
        persistDefaultTemplate,
    };
};
