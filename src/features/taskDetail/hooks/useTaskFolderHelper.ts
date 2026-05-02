/**
 * Task Folder Helper
 * Creates workspace folders for tasks and assigns notes to task folders.
 *
 * Lives in taskDetail — zero dependency on project / multiProject.
 * Callers supply:
 *   - workspaceId   (from their project store / resolver)
 *   - onFolderCreated  (to update their local task store)
 *   - findTask      (to look up a task from their store; falls back to tab metadata)
 */

import { useAuthStore, useConsoleHelper, useDebugLog, parseApiError, isUnauthorizedError } from "@/shared";
import type { BaseTab } from "@/shell";
import type { Task } from "../types/task.types";
import { taskService } from "../service/task.service";
import { workspaceService, WorkspaceItemAction } from "@/features/workspace";

export function useTaskFolderHelper() {
    const _console = useConsoleHelper();
    const { $user } = useAuthStore();
    const debugLog = useDebugLog();

    /**
     * After a new task is saved:
     * 1. Create a folder named after the task in the project's workspace
     * 2. Persist folderWorkspaceItemId on the task (API + open tabs)
     *
     * @param workspaceId    - project's workspace ID (resolved by caller)
     * @param onFolderCreated - caller's callback to update its local task store
     */
    const createTaskFolder = async (
        savedTask: Task,
        workspaceId: number | null | undefined,
        onFolderCreated?: (taskId: number, folderWorkspaceItemId: number) => void
    ): Promise<void> => {
        debugLog.log("task-folder", "createTaskFolder-start", {
            taskId: savedTask.id,
            title: savedTask.title,
            projectId: savedTask.projectId,
            existingFolderWorkspaceItemId: savedTask.folderWorkspaceItemId,
        });
        try {
            const token = $user.userToken ?? "";

            if (!workspaceId) {
                debugLog.log("task-folder", "createTaskFolder-skip-no-workspace", {
                    taskId: savedTask.id, projectId: savedTask.projectId,
                });
                return;
            }

            const folderName = savedTask.title || "Untitled";
            const createFolderRes = await workspaceService._upsertWorkspaceItems(token, workspaceId, [
                {
                    action: WorkspaceItemAction.Create,
                    entityType: 2,
                    parentId: null,
                    folderData: { name: folderName },
                },
            ]);

            if (!createFolderRes.success) {
                _console.error("Failed to create task folder in workspace");
                return;
            }

            const treeRes = await workspaceService._getWorkspaceTreeV2(token, workspaceId);
            if (!treeRes.success || !treeRes.object) {
                _console.error("Failed to load workspace tree after folder creation");
                return;
            }

            const newFolderWsItem = treeRes.object.flatData?.find(
                (item) => item.entityType === 2 && (item.data as any)?.name === folderName
            );

            if (!newFolderWsItem) {
                _console.error("Could not find newly created folder in workspace tree");
                return;
            }

            const folderWorkspaceItemId = newFolderWsItem.id;

            debugLog.log("task-folder", "createTaskFolder-folder-created", {
                taskId: savedTask.id,
                folderWorkspaceItemId,
                folderName: savedTask.title,
                workspaceId,
            });

            const updatedTaskResult = await taskService._upsertTaskBatch(token, [{
                id: savedTask.id,
                projectId: savedTask.projectId,
                parentTaskId: savedTask.parentTaskId,
                type: savedTask.type,
                title: savedTask.title,
                note: savedTask.note,
                status: savedTask.status,
                priority: savedTask.priority,
                startDate: savedTask.startDate ? savedTask.startDate.toISOString() : null,
                endDate: savedTask.endDate ? savedTask.endDate.toISOString() : null,
                orderIndex: savedTask.orderIndex,
                deletedAt: savedTask.deletedAt ? savedTask.deletedAt.toISOString() : null,
                folderWorkspaceItemId,
                checklistJson: savedTask.checklistJson,
                processJson: savedTask.processJson,
                customTabsJson: savedTask.customTabsJson,
            }]);

            if (updatedTaskResult.success && updatedTaskResult.data?.[0]) {
                debugLog.log("task-folder", "createTaskFolder-task-updated", {
                    taskId: savedTask.id,
                    folderWorkspaceItemId,
                    returnedFolderWorkspaceItemId: updatedTaskResult.data[0].folderWorkspaceItemId,
                });

                // Delegate all state updates to the caller.
                // openTabs is a stale closure here (patchTab inside upsertTask hasn't
                // re-rendered this hook yet), so looping openTabs to find the right tab
                // would fail for newly-created tasks whose id just changed from -1 → real id.
                // The caller holds the stable shell tab.id and uses patchTab's functional
                // updater to read fresh state — which is always correct.
                onFolderCreated?.(savedTask.id, folderWorkspaceItemId);
            }
        } catch (error) {
            console.error("Failed to create task folder:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to create task folder: ${errorMessage}`);
            }
        }
    };

    /**
     * After a task-created note is saved:
     * Adds the note to the task's workspace folder.
     *
     * workspaceId is read from activeTab.metadata (set by createTaskNote).
     * findTask is optional — falls back to activeTab.metadata.taskSnapshot.
     */
    const addNoteToTaskFolder = async (
        savedNote: { id: number },
        activeTab: BaseTab,
        findTask?: (id: number) => Task | undefined
    ): Promise<void> => {
        try {
            const token = $user.userToken ?? "";

            const folderWorkspaceItemId = activeTab.metadata?.folderWorkspaceItemId as number | null | undefined;
            if (!folderWorkspaceItemId) {
                _console.error("Task has no folder — folder should have been created when the task was saved");
                return;
            }

            const workspaceId = activeTab.metadata?.workspaceId as number | null | undefined;
            if (!workspaceId) {
                _console.error("Workspace ID missing from tab metadata");
                return;
            }

            const taskId = activeTab.metadata?.taskId as number;
            const task = findTask?.(taskId)
                ?? (activeTab.metadata?.taskSnapshot as Task | undefined)
                ?? null;
            if (!task) {
                _console.error("Task not found");
                return;
            }

            await workspaceService._upsertWorkspaceItems(token, workspaceId, [
                {
                    action: WorkspaceItemAction.Add,
                    entityType: 3,
                    entityId: savedNote.id,
                    parentId: folderWorkspaceItemId,
                },
            ]);

            _console.success("Note saved to task folder");
        } catch (error) {
            console.error("Failed to add note to task folder:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to add note to task folder: ${errorMessage}`);
            }
        }
    };

    return { createTaskFolder, addNoteToTaskFolder };
}
