/**
 * Editor Toolbar Helper
 * Orchestrates toolbar actions for different tab types (Note, Workspace, etc.)
 * Routes to appropriate service helpers based on active tab type
 */

import { useCallback } from "react";
import { useSnackbar } from "notistack";
import type { BaseTab } from "@/types/editor/tab.types";
import type { Note } from "@/types/note.types";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { useEditorTabsStore } from "@/store/index";
import { useEditorToolbarStore } from "@/store/editor/EditorToolbar.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useWsGridHelper } from "../ws/useWsGrid.helper";
import { useWsDetailHelper } from "../ws/useWsDetail.helper";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useWorkspaceItemHelper } from "../workspace/useWorkspaceItemHelper";
import { WorkspaceItemAction, Ws } from "@/types/workspace.types";
import { useNoteDetailHelper } from "../note/useNoteDetail.helper";
import { useWorkspaceLoader } from "../workspace";
import { useStandardRegistryHelper } from "../standardRegistry/useStandardRegistry.helper";
import { useConsoleHelper } from "../console/useConsole.helper";
import { useProjectDetailHelper } from "../project/useProjectDetail.helper";
import { Project } from "@/store/project/useProject.store";
import { useTaskDetailHelper } from "../task/useTaskDetail.helper";
import { Task } from "@/store/task/useTask.store";
import { workspaceService } from "@/services/workspace.service";
import { taskWorkspaceItemService } from "@/services/taskWorkspaceItem.service";

export const useEditorToolbarHelper = () => {
    const _console = useConsoleHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();
    const { $user } = useAuthStore();
    const _treeEditor = useWorkspaceItemHelper();

    // Get active tab
    const activeTab = getActiveTab();
    const { setOpenTabs, openTabs } = useEditorTabsStore();

    // Note-specific
    const { upsertNote } = useNoteDetailHelper();

    // Workspace-specific
    const { upsertWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsGridHelper();

    // Project-specific
    const { upsertProject } = useProjectDetailHelper();

    // Task-specific
    const { upsertTask } = useTaskDetailHelper();

    // WorkspaceTree-specific
    const { moduleName } = useGridControlStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { loadKeywords } = useStandardRegistryHelper();

    // Get status text based on tab type and deletion state
    const _deleteStatusText = (() => {
        if (!activeTab) return "No Tab";

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            const noteData = activeTab.data as Note;
            return noteData?.deletedAt ? "Deleted" : "Existing";
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            const wsData = activeTab.data as Ws;
            return wsData?.deletedAt ? "Deleted" : "Existing";
        } else if (activeTab.type === constants.vscode.tab.tabTypes.project) {
            const projectData = activeTab.data as Project;
            return projectData?.deletedAt ? "Deleted" : "Existing";
        } else if (activeTab.type === constants.vscode.tab.tabTypes.task) {
            const taskData = activeTab.data as Task;
            return taskData?.deletedAt ? "Deleted" : "Existing";
        }

        return "Existing";
    })();

    // Get item ID based on tab type
    const _itemId = (() => {
        if (!activeTab) return null;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            const noteData = activeTab.data as Note;
            return noteData?.id || null;
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            const wsData = activeTab.data as Ws;
            return wsData?.id || null;
        } else if (activeTab.type === constants.vscode.tab.tabTypes.project) {
            const projectData = activeTab.data as Project;
            return projectData?.id || null;
        } else if (activeTab.type === constants.vscode.tab.tabTypes.task) {
            const taskData = activeTab.data as Task;
            return taskData?.id || null;
        }

        return null;
    })();

    /**
     * After a task-created note is saved, create the workspace folder (if needed)
     * and add the note as a workspace item under that folder. Also link it to the task.
     *
     * Logic:
     * - Check if the task (T) already has a linked folder (itemType=2) via taskWorkspaceItemService
     * - If yes: use that folder's workspaceItemId as parentId for the note
     * - If no: create a new folder (name = savedNote.name), then link it to T
     * - Then add the note under that folder, and link the note to T
     */
    const _createTaskNoteWorkspaceItem = async (savedNote: Note, taskId: number, projectWorkspaceId: number, activeTab: BaseTab) => {
        try {
            const token = $user.userToken ?? "";

            // Step 1: Check if T already has a linked folder (itemType=2)
            const taskWsItemsRes = await taskWorkspaceItemService._getTaskWorkspaceItems(token, taskId);
            const existingFolderLink = taskWsItemsRes.data?.find((item) => item.itemType === 2);

            let parentWorkspaceItemId: number | null = null;

            if (existingFolderLink) {
                // T already has a linked folder — use it directly
                parentWorkspaceItemId = existingFolderLink.workspaceItemId;
            } else {
                // No linked folder — Create Folder
                const folderName = activeTab.metadata?.taskTitle ? `${activeTab.metadata.taskTitle}` : "Untitled";

                const createFolderRes = await workspaceService._upsertWorkspaceItems(token, projectWorkspaceId, [
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

                // Re-fetch tree to get the new folder's workspace_items.id
                const treeRes = await workspaceService._getWorkspaceTreeV2(token, projectWorkspaceId);
                if (!treeRes.success || !treeRes.object) {
                    _console.error("Failed to load project workspace after folder creation");
                    return;
                }

                const newFolderWsItem = treeRes.object.flatData?.find((item) => item.entityType === 2 && (item.data as any)?.name === folderName);

                if (!newFolderWsItem) {
                    _console.error("Could not find newly created folder in workspace tree");
                    return;
                }

                parentWorkspaceItemId = newFolderWsItem.id;

                // Link the new folder to T
                await taskWorkspaceItemService._linkTaskWorkspaceItem(token, taskId, {
                    workspaceItemId: newFolderWsItem.id,
                    itemType: 2,
                });
            }

            // Step 2: Add Note to Folder
            await workspaceService._upsertWorkspaceItems(token, projectWorkspaceId, [
                {
                    action: WorkspaceItemAction.Add,
                    entityType: 3,
                    entityId: savedNote.id,
                    parentId: parentWorkspaceItemId,
                },
            ]);

            // Step 3: Link Note to Task
            const treeRes2 = await workspaceService._getWorkspaceTreeV2(token, projectWorkspaceId);
            if (treeRes2.success && treeRes2.object) {
                const noteWsItem = treeRes2.object.flatData?.find((item) => item.entityType === 3 && item.entityId === savedNote.id);
                if (noteWsItem) {
                    await taskWorkspaceItemService._linkTaskWorkspaceItem(token, taskId, {
                        workspaceItemId: noteWsItem.id,
                        itemType: 3,
                    });
                }
            }

            _console.success("Note linked to task workspace");
        } catch (error) {
            console.error("Failed to create task note workspace item:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to link note to workspace: ${errorMessage}`);
            }
        }
    };

    // Handle Upsert - orchestrator for all entity types (create/update/soft delete/restore)
    const upsertOrchestraitor = useCallback(async () => {
        // STEP 1: Validate Active Tab
        if (!activeTab) return;

        // STEP 2: Set Saving State
        setIsSaving(true);

        try {
            // STEP 3: Route to Appropriate Handler Based on Module + Tab Type
            // REGULAR HANDLERS (Note from NoteGrid, Workspace, Project, etc.)
            switch (activeTab.type) {
                case constants.vscode.tab.tabTypes.workspace:
                    // WORKSPACE HANDLER: Delegate to Workspace Upsert Logic
                    await upsertWorkspace(activeTab.id);
                    loadWorkspaces();
                    loadKeywords();
                    break;
                case constants.vscode.tab.tabTypes.project:
                    // PROJECT HANDLER: Delegate to Project Upsert Logic (upsertProject already reloads projects)
                    await upsertProject(activeTab.id);
                    break;
                case constants.vscode.tab.tabTypes.task:
                    // TASK HANDLER: Delegate to Task Upsert Logic
                    await upsertTask(activeTab.id);
                    break;
                case constants.vscode.tab.tabTypes.note: //* thêm các entity type khác ở đây
                    const data = activeTab.data as Note;
                    const workspaceItem = currentWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === data.id);

                    // UPDATE entity data - use entity-specific API (upsertNote)
                    if (!workspaceItem || workspaceItem.id > 0) {
                        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
                            const savedNote = await upsertNote(activeTab.id);
                            if (!savedNote) {
                                throw new Error("Failed to update note");
                            }
                            loadKeywords();

                            // POST-SAVE: If note was created from a task, create workspace folder+item
                            const taskMeta = activeTab.metadata;
                            if (taskMeta?.taskId && taskMeta?.projectWorkspaceId && data.id < 0) {
                                await _createTaskNoteWorkspaceItem(savedNote, taskMeta.taskId as number, taskMeta.projectWorkspaceId as number, activeTab);
                            }
                        }
                        //* thêm các entity type khác ở đây
                    }
                    // CREATE new entity + workspace_item - use workspace API
                    else if (workspaceItem.id < 0 && (activeTab.data as { id: number }).id < 0) {
                        await _treeEditor.upsertWorkspaceItem(WorkspaceItemAction.Create);
                        loadKeywords();
                    } else {
                        console.error("Unexpected case in upsertOrchestraitor");
                    }
                    break;
                default:
                    console.error("This case doesnt happen");
                    return;
            }
        } catch (error) {
            // STEP 4: Handle Errors
            console.error("Failed to save:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to save ${activeTab.type}: ${errorMessage}`);
            }
        } finally {
            // STEP 5: Reset Saving State
            setIsSaving(false);
        }
    }, [activeTab, moduleName, currentWorkspace, upsertWorkspace, upsertProject, upsertTask, _treeEditor, $user, setIsSaving]);

    // Handle Cancel - routes to appropriate reset logic
    const commonCancel = useCallback(() => {
        if (!activeTab) return;

        // Reset tab.data to tab.data0 (original from DB/tree)
        if (activeTab.data0) {
            setOpenTabs((prev) =>
                prev.map((tab) =>
                    tab.id === activeTab.id
                        ? { ...tab, data: tab.data0 } // hasUnsavedChanges will be auto-calculated
                        : tab,
                ),
            );
            _console.info("Changes discarded");
        }
    }, [activeTab, setOpenTabs, _console]);

    return {
        upsertOrchestraitor,
        commonCancel,
        _deleteStatusText,
        _itemId,
    };
};
