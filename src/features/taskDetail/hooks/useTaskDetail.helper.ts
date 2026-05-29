/**
 * Task Detail Helper — core entry point
 *
 * Functions only:
 *  - Task upsert           (save / create / restore)
 *  - Keyword / workspace   (link, navigate, unlink)
 *
 * Pure utilities moved to TaskDetail.utils.ts.
 * State lives in useTaskStore. Derived values live in Selectors.
 * Side-effects (useEffect) live in TaskDetailHeadless.
 */

import React from "react";
import { Task } from "../types/task.types";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { taskService } from "../service/task.service";
import { useAuthStore, useKeywordSelector } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useEditorTabBarHelper } from "@/shell";
import { useConsoleHelper } from "@/shared";
import { parseAsLocalDate, toLocalISOString } from "@/shared";
import { useTaskLinkedKeywordsHelper } from "../hooks/useTaskLinkedKeywords.helper";
import { useCommandPaletteHelper } from "@/shell";
import { useKeywordNavigationHelper } from "@/shell";
import { useConfirmationPopoverHelper } from "@/shared";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useDebugLog } from "@/shared";
import { usePTaskStore } from "@/features/project";

// Re-export utils for backward compatibility
export { getTaskStatusColors, getTaskPriorityColors, formatDate, transformTaskData } from "../utils/TaskDetail.utils";

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────

export const useTaskDetailHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { setTasks } = usePTaskStore();
    const { linkedKeywords, folderItems } = useTaskDetailStore();
    const { allKeywords } = useKeywordSelector();
    const debugLog = useDebugLog();
    const { selectedTask } = useTaskDetailSelector();

    // ── Linked keywords & workspace items ─────────────────────────────────────
    const { linkKeyword, unlinkKeyword } = useTaskLinkedKeywordsHelper();
    const { openForLink } = useCommandPaletteHelper();
    const { navigateLink } = useKeywordNavigationHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();

    const handleOpenLinkPalette = () => {
        if (!selectedTask) return;
        const linkedIds = new Set(linkedKeywords.map((lk) => lk.keywordId));
        const folderWsItemIds = new Set(folderItems.map((fi) => fi.workspaceItemId));
        allKeywords.forEach((kw: { workspaceItemId?: number; id: number }) => {
            if (kw.workspaceItemId !== undefined && folderWsItemIds.has(kw.workspaceItemId)) {
                linkedIds.add(kw.id);
            }
        });
        openForLink((keyword) => linkKeyword(selectedTask.id, keyword.id), linkedIds);
    };

    const handleNavigateKeyword = (keyword: { link: string; longLink: string; name: string; type: any; id: number; hardDeletedAt: null }) => {
            navigateLink(keyword as any, {
                link: `sa/p${selectedTask?.projectId}/t${selectedTask?.id}`,
                label: selectedTask?.title ?? "",
            });
        };

    const handleUnlinkKeyword = (event: React.MouseEvent, linkId: number, name: string) => {
            if (!selectedTask) return;
            showConfirmation({
                title: name,
                subtitle: "This will remove the link between this keyword and the task.",
                confirmText: "Unlink",
                cancelText: "Cancel",
                confirmColor: "destructive",
                cancelColor: "outline",
                anchorEl: event.currentTarget as HTMLElement,
                onConfirm: async () => {
                    await unlinkKeyword(selectedTask.id, linkId);
                },
            });
        };

    // ── Save task (upsert) ────────────────────────────────────────────────────

    const upsertTask = async (tabId?: string): Promise<Task | null> => {
            const activeTab = getActiveTab(tabId);
            const taskToSave = activeTab?.data as Task | undefined;

            if (!taskToSave) {
                console.warn("No selected task to upsert");
                return null;
            }
            if (!taskToSave.title?.trim()) {
                _console.error("Task title is required");
                return null;
            }

            const isCreateMode = taskToSave.id <= 0;
            const originalTask = activeTab?.data0 as Task | undefined;
            const isRestoreMode = taskToSave.id > 0 && !!originalTask?.deletedAt && !taskToSave.deletedAt;

            debugLog.log("task-upsert", "upsertTask-start", {
                taskId: taskToSave.id,
                isCreateMode,
                folderWorkspaceItemId: taskToSave.folderWorkspaceItemId,
                originalFolderWorkspaceItemId: originalTask?.folderWorkspaceItemId,
                title: taskToSave.title,
                source: "useTaskDetail.helper",
            });

            try {
                // For existing tasks: send original (last-saved) values for section fields
                // so Ctrl+S doesn't overwrite in-progress section edits.
                // Sections save themselves independently via PATCH.
                const sectionNote = isCreateMode ? taskToSave.note : (originalTask?.note ?? taskToSave.note);
                const sectionChecklist = isCreateMode ? taskToSave.checklistJson : (originalTask?.checklistJson ?? taskToSave.checklistJson);
                const sectionProcess = isCreateMode ? taskToSave.processJson : (originalTask?.processJson ?? taskToSave.processJson);
                const sectionCustomTabs = isCreateMode ? taskToSave.customTabsJson : (originalTask?.customTabsJson ?? taskToSave.customTabsJson);

                const result = await taskService._upsertTaskBatch($user.userToken, [
                    {
                        id: isCreateMode ? 0 : taskToSave.id,
                        projectId: taskToSave.projectId,
                        parentTaskId: taskToSave.parentTaskId,
                        type: taskToSave.type || "task",
                        taskType: taskToSave.taskType || "personal",
                        title: taskToSave.title,
                        note: sectionNote,
                        status: taskToSave.status || "open",
                        priority: taskToSave.priority || "low",
                        startDate: toLocalISOString(taskToSave.startDate),
                        endDate: toLocalISOString(taskToSave.endDate),
                        orderIndex: taskToSave.orderIndex || 0,
                        deletedAt: isRestoreMode ? null : toLocalISOString(taskToSave.deletedAt),
                        folderWorkspaceItemId: taskToSave.folderWorkspaceItemId,
                        checklistJson: sectionChecklist,
                        processJson: sectionProcess,
                        customTabsJson: sectionCustomTabs,
                        isMilestone: taskToSave.isMilestone ?? false,
                    },
                ]);

                if (!result.success) throw new Error(result.message || "Failed to save task");

                const savedTask = result?.data?.[0] ?? null;
                if (!savedTask) throw new Error("Failed to save task: No data returned from server");

                debugLog.log("task-upsert", "upsertTask-response", {
                    taskId: savedTask.id,
                    folderWorkspaceItemId_sent: taskToSave.folderWorkspaceItemId,
                    folderWorkspaceItemId_returned: savedTask.folderWorkspaceItemId,
                    isCreateMode,
                    source: "useTaskDetail.helper",
                });

                const transformedTask: Task = {
                    id: savedTask.id,
                    projectId: savedTask.projectId,
                    parentTaskId: savedTask.parentTaskId,
                    type: savedTask.type,
                    taskType: savedTask.taskType || "personal",
                    title: savedTask.title,
                    note: savedTask.note,
                    status: savedTask.status,
                    priority: savedTask.priority,
                    startDate: parseAsLocalDate(savedTask.startDate),
                    endDate: parseAsLocalDate(savedTask.endDate),
                    orderIndex: savedTask.orderIndex,
                    createdAt: parseAsLocalDate(savedTask.createdAt) || new Date(),
                    updatedAt: parseAsLocalDate(savedTask.updatedAt),
                    deletedAt: parseAsLocalDate(savedTask.deletedAt),
                    folderWorkspaceItemId: savedTask.folderWorkspaceItemId,
                    checklistJson: savedTask.checklistJson ?? null,
                    processJson: savedTask.processJson ?? null,
                    customTabsJson: savedTask.customTabsJson ?? null,
                    isMilestone: savedTask.isMilestone ?? false,
                    // Preserve limit dates (not returned by upsert API)
                    projectStartDate: taskToSave.projectStartDate,
                    projectEndDate: taskToSave.projectEndDate,
                    parentStartDate: taskToSave.parentStartDate,
                    parentEndDate: taskToSave.parentEndDate,
                };

                _console.success(isCreateMode ? "Task created successfully" : "Task saved successfully");
                debugLog.flush();

                if (tabId) {
                    patchTab(tabId, {
                        title: transformedTask.title || "Unsaved Task",
                        data: transformedTask,
                        data0: transformedTask,
                        hasUnsavedChanges: false,
                    });
                }

                setTasks((prev) => prev.map((t) => (t.id === transformedTask.id ? transformedTask : t)));
                return transformedTask;
            } catch (err) {
                console.error("Failed to save task:", err);
                const errorMessage = await parseApiError(err);
                _console.error(isUnauthorizedError(err) ? "Unauthorized. Please login again." : `Failed to save task: ${errorMessage}`);
                return null;
            }
        };

    /**
     * @deprecated Use handleFieldChange instead.
     * Targets the active tab — kept for backward compatibility.
     */
    // const handleTaskFieldChange = (field: keyof Task, value: any) => {
    //         const activeTabId = getActiveTab()?.id;
    //         if (!activeTabId) return;
    //         patchTab(activeTabId, (cur) => ({
    //             data: { ...(cur.data as Task), [field]: value },
    //             hasUnsavedChanges: true,
    //         }));
    //     };

    // ── Return ────────────────────────────────────────────────────────────────
    return {
        // save
        upsertTask,
        /** @deprecated */
        // handleTaskFieldChange,

        // keyword handlers (own functions — compose from sub-helpers internally)
        handleOpenLinkPalette,
        handleNavigateKeyword,
        handleUnlinkKeyword,
    };
};
