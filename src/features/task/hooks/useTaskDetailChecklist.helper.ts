/**
 * Task Detail Checklist Helper
 * Handles checklist state changes, server persistence, and template management.
 *
 * Race-condition fix (rapid toggle):
 *   handleChecklistChange accepts a transform fn (current → next).
 *   The transform is applied inside setOpenTabs' functional updater, which always
 *   receives the latest state — eliminating the stale-closure overwrite problem.
 *   Server saves are debounced (300 ms) so rapid toggles produce one network call.
 */

import { useCallback, useEffect, useRef } from "react";
import { Task, useTaskStore } from "../store/useTask.store";
import { taskService } from "../service/task.service";
import { standardRegistryService } from "@/services/standardRegistry.service";
import { useAuthStore } from "@/store/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { ChecklistJSON } from "../types/checklist.types";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";

export type ChecklistUpdater = ChecklistJSON | ((current: ChecklistJSON) => ChecklistJSON);

const FALLBACK_CHECKLIST: ChecklistJSON = { groups: [], checklistType: "checklist" } as unknown as ChecklistJSON;

function parseChecklist(raw: string | null | undefined): ChecklistJSON {
    try { return raw ? (JSON.parse(raw) as ChecklistJSON) : FALLBACK_CHECKLIST; }
    catch { return FALLBACK_CHECKLIST; }
}

export const useTaskDetailChecklistHelper = () => {
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { setTasks } = useTaskStore();
    const { selectedTask } = useTaskDetailSelector();

    // ── Refs for stable access in async / deferred callbacks ─────────────────
    const selectedTaskRef = useRef(selectedTask);
    selectedTaskRef.current = selectedTask;

    const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Latest computed checklist waiting to be flushed to the server */
    const pendingChecklistRef = useRef<ChecklistJSON | null>(null);

    // Cleanup debounce timer on unmount
    useEffect(() => () => {
        if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    }, []);

    /** Persist checklistJson to server (no auto-complete — only process controls completion) */
    const saveChecklistToServer = useCallback(
        async (json: ChecklistJSON, task: Task) => {
            if (task.id <= 0 || !$user.userToken) return;
            const newChecklistJson = JSON.stringify(json);
            await taskService._patchTask($user.userToken, task.id, { checklistJson: newChecklistJson });
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
        [$user.userToken, activeTabId, setOpenTabs],
    );

    /** Schedule a debounced flush of the latest pending checklist to the server */
    const scheduleSave = useCallback(() => {
        if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
        serverSaveTimerRef.current = setTimeout(() => {
            const task = selectedTaskRef.current;
            const pending = pendingChecklistRef.current;
            if (pending && task && task.id > 0) {
                saveChecklistToServer(pending, task);
                pendingChecklistRef.current = null;
            }
        }, 300);
    }, [saveChecklistToServer]);

    /**
     * Apply a checklist update (optimistic) and schedule a server save.
     *
     * Accepts either:
     *   • a ready-made ChecklistJSON (from save/edit-mode)
     *   • a transform fn `(current) => next` (from toggle) — applied inside the
     *     setOpenTabs functional updater so it always sees the freshest state,
     *     preventing rapid-click overwrites.
     */
    const handleChecklistChange = useCallback(
        (updater: ChecklistUpdater) => {
            const task = selectedTaskRef.current;
            if (!task) return;
            const isNewTask = task.id <= 0;

            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) => {
                    if (t.id !== activeTabId) return t;
                    const currentTask = t.data as Task;
                    const current = parseChecklist(currentTask.checklistJson);
                    const updated = typeof updater === "function" ? updater(current) : updater;
                    // Capture the latest value so the debounced save uses the final state
                    if (!isNewTask) pendingChecklistRef.current = updated;
                    return {
                        ...t,
                        data: { ...currentTask, checklistJson: JSON.stringify(updated) },
                        hasUnsavedChanges: isNewTask,
                    };
                }),
            );

            if (!isNewTask) scheduleSave();
        },
        [activeTabId, setOpenTabs, scheduleSave],
    );

    /** Checklist saved from edit mode (full replacement, not a toggle) */
    const handleChecklistSave = useCallback(
        (json: ChecklistJSON) => {
            const task = selectedTaskRef.current;
            if (task) handleChecklistChange(json);
        },
        [handleChecklistChange],
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
