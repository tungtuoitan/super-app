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

import React, { useCallback } from "react";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { taskService } from "@/services/task.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useGeneralStore } from "@/store/general/General.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useConsoleHelper } from "../console/useConsole.helper";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";
import { useTaskLinkedKeywordsHelper } from "@/hooks/task/useTaskLinkedKeywords.helper";
import { useCommandPaletteHelper } from "@/hooks/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";
import { debugLog } from "@/hooks/debugLog/useDebugLog";

// Re-export utils for backward compatibility
export { getTaskStatusColors, getTaskPriorityColors, formatDate, transformTaskData } from "../../utils/task/TaskDetail.utils";

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────

export const useTaskDetailHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { setOpenTabs, activeTabId, openTabs } = useEditorTabsStore();
    const { setTasks, linkedKeywords, folderItems } = useTaskStore();
    const { allKeywords } = useGeneralStore();

    const { selectedTask } = useTaskDetailSelector();
    const { submitVersionComment } = useTaskCommentHelper();

    // ── Linked keywords & workspace items ─────────────────────────────────────
    const { linkKeyword, unlinkKeyword } = useTaskLinkedKeywordsHelper();
    const { openForLink } = useCommandPaletteHelper();
    const { navigateLink } = useKeywordNavigationHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();

    const handleOpenLinkPalette = useCallback(() => {
        if (!selectedTask) return;
        const linkedIds = new Set(linkedKeywords.map((lk) => lk.keywordId));
        const folderWsItemIds = new Set(folderItems.map((fi) => fi.workspaceItemId));
        allKeywords.forEach((kw) => {
            if (kw.workspaceItemId !== undefined && folderWsItemIds.has(kw.workspaceItemId)) {
                linkedIds.add(kw.id);
            }
        });
        openForLink((keyword) => linkKeyword(selectedTask.id, keyword.id), linkedIds);
    }, [selectedTask, openForLink, linkKeyword, linkedKeywords, folderItems, allKeywords]);

    const handleNavigateKeyword = useCallback(
        (keyword: { link: string; longLink: string; name: string; type: any; id: number; hardDeletedAt: null }) => {
            navigateLink(keyword as any, {
                link: `sa/p${selectedTask?.projectId}/t${selectedTask?.id}`,
                label: selectedTask?.title ?? "",
            });
        },
        [navigateLink, selectedTask],
    );

    const handleUnlinkKeyword = useCallback(
        (event: React.MouseEvent, linkId: number, name: string) => {
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
        },
        [selectedTask, unlinkKeyword, showConfirmation],
    );

    // ── Save task (upsert) ────────────────────────────────────────────────────

    const upsertTask = useCallback(
        async (tabId?: string): Promise<Task | null> => {
            const activeTab = openTabs.find((tab) => tab.id === (tabId ?? activeTabId));
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
                    // Preserve limit dates (not returned by upsert API)
                    projectStartDate: taskToSave.projectStartDate,
                    projectEndDate: taskToSave.projectEndDate,
                    parentStartDate: taskToSave.parentStartDate,
                    parentEndDate: taskToSave.parentEndDate,
                };

                _console.success(isCreateMode ? "Task created successfully" : "Task saved successfully");
                debugLog.flush();

                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) =>
                            tab.id === tabId
                                ? { ...tab, title: transformedTask.title || "Unsaved Task", data: transformedTask, data0: transformedTask, hasUnsavedChanges: false }
                                : tab,
                        ),
                    );
                }

                setTasks((prev) => prev.map((t) => (t.id === transformedTask.id ? transformedTask : t)));
                return transformedTask;
            } catch (err) {
                console.error("Failed to save task:", err);
                const errorMessage = await parseApiError(err);
                _console.error(isUnauthorizedError(err) ? "Unauthorized. Please login again." : `Failed to save task: ${errorMessage}`);
                return null;
            }
        },
        [openTabs, activeTabId, $user, _console, setOpenTabs, setTasks, submitVersionComment],
    );

    /**
     * @deprecated Use handleFieldChange instead.
     * Targets the active tab via store's activeTabId — kept for backward compatibility.
     */
    const handleTaskFieldChange = useCallback(
        (field: keyof Task, value: any) => {
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t: BaseTab) => {
                    if (t.id !== activeTabId) return t;
                    return { ...t, data: { ...(t.data as Task), [field]: value }, hasUnsavedChanges: true };
                }),
            );
        },
        [activeTabId, setOpenTabs],
    );

    // ── Return ────────────────────────────────────────────────────────────────
    return {
        // save
        upsertTask,
        /** @deprecated */
        handleTaskFieldChange,

        // keyword handlers (own functions — compose from sub-helpers internally)
        handleOpenLinkPalette,
        handleNavigateKeyword,
        handleUnlinkKeyword,
    };
};
