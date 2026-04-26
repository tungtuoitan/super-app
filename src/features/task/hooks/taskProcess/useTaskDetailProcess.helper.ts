/**
 * Task Detail Process Helper
 * Handles process state changes and server persistence.
 * Mirrors useTaskDetailChecklist.helper — same pattern, uses processJson field.
 *
 * Race-condition fix: handleProcessChange accepts a transform fn so rapid toggles
 * always operate on the latest state (see useTaskDetailChecklist.helper for details).
 */

import { useEffect, useRef } from "react";
import { Task, useTaskStore } from "../../store/useTask.store";
import { taskService } from "../../service/task.service";
import { useAuthStore } from "@/store/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { ChecklistJSON } from "../../types/checklist.types";
import { isChecklistAllDone } from "@/utils/checklist.utils";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";

export type ProcessUpdater = ChecklistJSON | ((current: ChecklistJSON) => ChecklistJSON);

const FALLBACK_PROCESS: ChecklistJSON = { groups: [], checklistType: "checklist" } as unknown as ChecklistJSON;

function parseProcess(raw: string | null | undefined): ChecklistJSON {
    try { return raw ? (JSON.parse(raw) as ChecklistJSON) : FALLBACK_PROCESS; }
    catch { return FALLBACK_PROCESS; }
}

export const useTaskDetailProcessHelper = () => {
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { setTasks } = useTaskStore();
    const { selectedTask } = useTaskDetailSelector();

    // ── Refs for stable access in async / deferred callbacks ─────────────────
    const selectedTaskRef = useRef(selectedTask);
    selectedTaskRef.current = selectedTask;

    const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingProcessRef = useRef<ChecklistJSON | null>(null);

    useEffect(() => () => {
        if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    }, []);

    /** Persist processJson to server — auto-completes task when all steps done */
    const saveProcessToServer = async (json: ChecklistJSON, task: Task) => {
            if (task.id <= 0 || !$user.userToken) return;
            const allDone = isChecklistAllDone(json);
            const newStatus = allDone
                ? "completed"
                : task.status === "completed" ? "in_progress" : task.status;
            const newProcessJson = JSON.stringify(json);

            await taskService._patchTask($user.userToken, task.id, {
                processJson: newProcessJson,
                status: newStatus,
            });

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

            setTasks((prev) =>
                prev.map((t) =>
                    t.id === task.id ? { ...t, processJson: newProcessJson, status: newStatus } : t,
                ),
            );
        };

    const scheduleSave = () => {
        if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
        serverSaveTimerRef.current = setTimeout(() => {
            const task = selectedTaskRef.current;
            const pending = pendingProcessRef.current;
            if (pending && task && task.id > 0) {
                saveProcessToServer(pending, task);
                pendingProcessRef.current = null;
            }
        }, 300);
    };

    /**
     * Apply a process update (optimistic) and schedule a debounced server save.
     * Accepts a ChecklistJSON (edit-mode save) or a transform fn (toggle).
     */
    const handleProcessChange = 
        (updater: ProcessUpdater) => {
            const task = selectedTaskRef.current;
            if (!task) return;
            const isNewTask = task.id <= 0;

            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) => {
                    if (t.id !== activeTabId) return t;
                    const currentTask = t.data as Task;
                    const current = parseProcess(currentTask.processJson);
                    const updated = typeof updater === "function" ? updater(current) : updater;
                    if (!isNewTask) pendingProcessRef.current = updated;
                    return {
                        ...t,
                        data: { ...currentTask, processJson: JSON.stringify(updated) },
                        hasUnsavedChanges: isNewTask,
                    };
                }),
            );

            if (!isNewTask) scheduleSave();
        }

    /** Process saved from edit mode (full replacement) */
    const handleProcessSave = (json: ChecklistJSON) => {
            const task = selectedTaskRef.current;
            if (task) handleProcessChange(json);
    }

    return {
        saveProcessToServer,
        handleProcessChange,
        handleProcessSave,
    };
};
