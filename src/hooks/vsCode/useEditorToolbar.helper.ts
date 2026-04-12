/**
 * Editor Toolbar Helper
 * Orchestrates toolbar actions for different tab types (Note, Workspace, etc.)
 * Routes to appropriate service helpers based on active tab type
 */

import { useCallback, useRef, useEffect } from "react";
import { useSnackbar } from "notistack";
import type { BaseTab } from "@/types/editor/tab.types";
import type { Note } from "@/features/note/types/note.types";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
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
import { useNoteDetailHelper } from "@/features/note/hooks/useNoteDetail.helper";
import { useWorkspaceLoader } from "../workspace";
import { useStandardRegistryHelper } from "../standardRegistry/useStandardRegistry.helper";
import { useConsoleHelper } from "../console/useConsole.helper";
import { useProjectDetailHelper } from "../project/useProjectDetail.helper";
import { Project } from "@/store/project/useProject.store";
import { useTaskDetailHelper } from "../task/useTaskDetail.helper";
import { Task } from "@/store/task/useTask.store";
import { workspaceService } from "@/services/workspace.service";
import { taskService } from "@/services/task.service";
import { projectService, ProjectDTO } from "@/services/project.service";
import { useProjectStore } from "@/store/project/useProject.store";
import { useTaskStore } from "@/store/task/useTask.store";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";
import { useLifeLogLogHelper } from "../lifeLog/useLifeLogLog.helper";
import { useLifeLogTrackHelper } from "../lifeLog/useLifeLogTrack.helper";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import type { LifeLogLog, LifeLogTrack } from "@/types/lifeLog.types";
import { debugLog } from "@/hooks/debugLog/useDebugLog";

export const useEditorToolbarHelper = () => {
    const _console = useConsoleHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();
    const { $user } = useAuthStore();
    const _treeEditor = useWorkspaceItemHelper();

    // Get active tab
    const activeTab = getActiveTab();
    const { setOpenTabs, openTabs, setActiveTabId } = useEditorTabsStore();

    // Note-specific
    const { upsertNote } = useNoteDetailHelper();

    // Workspace-specific
    const { upsertWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsGridHelper();

    // Project-specific
    const { upsertProject } = useProjectDetailHelper();

    // Task-specific
    const { upsertTask } = useTaskDetailHelper();

    // LifeLog-specific
    const { upsertLog } = useLifeLogLogHelper();
    const { upsertTrack } = useLifeLogTrackHelper();
    const { setLogs, setTracks } = useLifeLogStore();

    // WorkspaceTree-specific
    const { moduleName } = useGridControlStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { loadKeywords } = useStandardRegistryHelper();
    const { projects, setProjects } = useProjectStore();
    const { tasks, setTasks } = useTaskStore();

    // Refs to always have latest values inside useCallback closures
    const tasksRef = useRef(tasks);
    const projectsRef = useRef(projects);
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);

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
     * After a new task is saved:
     * 1. Ensure project has a workspace (create if not)
     * 2. Create a folder named after the task in that workspace
     * 3. Update task.folderWorkspaceItemId in DB and local store
     */
    const _createTaskFolder = async (savedTask: Task) => {
        debugLog.log("task-folder", "createTaskFolder-start", {
            taskId: savedTask.id,
            title: savedTask.title,
            projectId: savedTask.projectId,
            existingFolderWorkspaceItemId: savedTask.folderWorkspaceItemId,
        });
        try {
            const token = $user.userToken ?? "";

            // --- Ensure project has a workspace ---
            let project = projectsRef.current.find((p) => p.id === savedTask.projectId);
            if (!project) {
                const result = await projectService._getProjects(token, { ids: savedTask.projectId.toString() });
                if (result.success && result.data && result.data.length > 0) {
                    const fetched: Project[] = (result.data as ProjectDTO[]).map((dto) => ({
                        id: dto.id,
                        name: dto.name,
                        description: dto.description,
                        status: dto.status,
                        startDate: parseAsLocalDate(dto.startDate),
                        endDate: parseAsLocalDate(dto.endDate),
                        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
                        updatedAt: parseAsLocalDate(dto.updatedAt),
                        deletedAt: parseAsLocalDate(dto.deletedAt),
                        workspaceId: dto.workspaceId,
                    }));
                    setProjects((prev) => {
                        const ids = new Set(prev.map((p) => p.id));
                        return [...prev, ...fetched.filter((p) => !ids.has(p.id))];
                    });
                    project = fetched.find((p) => p.id === savedTask.projectId);
                }
            }
            if (!project) {
                _console.error("Project not found — cannot create task folder");
                return;
            }

            let workspaceId = project.workspaceId;
            if (!workspaceId) {
                debugLog.log("task-folder", "createTaskFolder-skip-no-workspace", {
                    taskId: savedTask.id, projectId: savedTask.projectId,
                });
                return;
            }

            // --- Create folder named after task ---
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

            // Fetch tree to get new folder's workspace_items.id
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

            // --- Update task with folderWorkspaceItemId ---
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
                setTasks((prev) => prev.map((t) =>
                    t.id === savedTask.id ? { ...t, folderWorkspaceItemId } : t
                ));
                // Also update the open tab's data so TaskDetailContent sees the new folderWorkspaceItemId
                setOpenTabs((prev) => prev.map((tab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.task && (tab.data as Task).id === savedTask.id) {
                        return { ...tab, data: { ...tab.data as Task, folderWorkspaceItemId }, data0: { ...tab.data0 as Task, folderWorkspaceItemId } };
                    }
                    return tab;
                }));
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
     * Add note to the task's workspace folder (folderWorkspaceItemId from tab metadata).
     */
    const _addNoteToTaskFolder = async (savedNote: Note, activeTab: BaseTab) => {
        try {
            const token = $user.userToken ?? "";

            const folderWorkspaceItemId = activeTab.metadata?.folderWorkspaceItemId as number | null | undefined;
            if (!folderWorkspaceItemId) {
                _console.error("Task has no folder — folder should have been created when the task was saved");
                return;
            }

            // Resolve workspaceId via task → project
            const taskId = activeTab.metadata?.taskId as number;
            const task = tasksRef.current.find((t) => t.id === taskId)
                ?? (activeTab.metadata?.taskSnapshot as Task | undefined) ?? null;
            if (!task) {
                _console.error("Task not found");
                return;
            }

            let project = projectsRef.current.find((p) => p.id === task.projectId);
            if (!project) {
                const result = await projectService._getProjects(token, { ids: task.projectId.toString() });
                if (result.success && result.data && result.data.length > 0) {
                    const fetched: Project[] = (result.data as ProjectDTO[]).map((dto) => ({
                        id: dto.id,
                        name: dto.name,
                        description: dto.description,
                        status: dto.status,
                        startDate: parseAsLocalDate(dto.startDate),
                        endDate: parseAsLocalDate(dto.endDate),
                        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
                        updatedAt: parseAsLocalDate(dto.updatedAt),
                        deletedAt: parseAsLocalDate(dto.deletedAt),
                        workspaceId: dto.workspaceId,
                    }));
                    setProjects((prev) => {
                        const ids = new Set(prev.map((p) => p.id));
                        return [...prev, ...fetched.filter((p) => !ids.has(p.id))];
                    });
                    project = fetched.find((p) => p.id === task.projectId);
                }
            }
            if (!project?.workspaceId) {
                _console.error("Project workspace not found");
                return;
            }

            await workspaceService._upsertWorkspaceItems(token, project.workspaceId as number, [
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
                    // loadKeywords();
                    break;
                case constants.vscode.tab.tabTypes.project:
                    // PROJECT HANDLER: Delegate to Project Upsert Logic (upsertProject already reloads projects)
                    await upsertProject(activeTab.id);
                    break;
                case constants.vscode.tab.tabTypes.task: {
                    // TASK HANDLER: Delegate to Task Upsert Logic
                    const isNewTask = (activeTab.data as Task).id <= 0;
                    debugLog.log("task-upsert", "toolbar-save-task", {
                        taskId: (activeTab.data as Task).id,
                        isNewTask,
                        folderWorkspaceItemId: (activeTab.data as Task).folderWorkspaceItemId,
                        source: "useEditorToolbar.helper",
                    });
                    const savedTask = await upsertTask(activeTab.id);
                    // After creating a new task, auto-create its workspace folder
                    if (isNewTask && savedTask) {
                        await _createTaskFolder(savedTask);
                    }
                    break;
                }
                case constants.vscode.tab.tabTypes.lifeLog: {
                    const log = activeTab.data as LifeLogLog;
                    const isNew = log.id <= 0;
                    const tempId = log.id;
                    const saved = await upsertLog({
                        id: isNew ? 0 : log.id,
                        type: log.type,
                        trackId: log.trackId,
                        title: log.title,
                        description: log.description,
                        isSensitive: log.isSensitive,
                        location: log.location,
                        occurAt: log.occurAt ? toLocalISOString(log.occurAt) ?? undefined : undefined,
                    });
                    if (saved) {
                        if (isNew) {
                            const newTabId = `lifelog-tab-${saved.id}-${Date.now()}`;
                            setLogs((prev) => prev.map((l) => l.id === tempId ? saved : l));
                            setOpenTabs((prev) =>
                                prev.map((t) => t.id === activeTab.id
                                    ? { ...t, id: newTabId, data: saved, data0: saved, hasUnsavedChanges: false }
                                    : t
                                )
                            );
                            setActiveTabId(newTabId);
                        } else {
                            setOpenTabs((prev) =>
                                prev.map((t) => t.id === activeTab.id ? { ...t, data0: t.data, hasUnsavedChanges: false } : t)
                            );
                        }
                    }
                    break;
                }
                case constants.vscode.tab.tabTypes.lifeLogTrack: {
                    const track = activeTab.data as LifeLogTrack;
                    const isNew = track.id <= 0;
                    const tempId = track.id;
                    const saved = await upsertTrack({
                        id: isNew ? 0 : track.id,
                        name: track.name,
                        description: track.description,
                        emoji: track.emoji,
                        color: track.color,
                        isSensitive: track.isSensitive,
                    });
                    if (saved) {
                        if (isNew) {
                            const newTabId = `lifelog-track-tab-${saved.id}-${Date.now()}`;
                            setTracks((prev) => prev.map((t) => t.id === tempId ? saved : t));
                            setOpenTabs((prev) =>
                                prev.map((t) => t.id === activeTab.id
                                    ? { ...t, id: newTabId, data: saved, data0: saved, hasUnsavedChanges: false }
                                    : t
                                )
                            );
                            setActiveTabId(newTabId);
                        } else {
                            setOpenTabs((prev) =>
                                prev.map((t) => t.id === activeTab.id ? { ...t, data0: t.data, hasUnsavedChanges: false } : t)
                            );
                        }
                    }
                    break;
                }
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

                            // POST-SAVE: If note was created from a task, add it to the task's folder
                            const taskMeta = activeTab.metadata;
                            if (taskMeta?.taskId && taskMeta?.folderWorkspaceItemId && data.id < 0) {
                                await _addNoteToTaskFolder(savedNote, activeTab);
                            } else {
                                // loadKeywords();
                            }
                        }
                        //* thêm các entity type khác ở đây
                    }
                    // CREATE new entity + workspace_item - use workspace API
                    else if (workspaceItem.id < 0 && (activeTab.data as { id: number }).id < 0) {
                        await _treeEditor.upsertWorkspaceItem(WorkspaceItemAction.Create);
                        // loadKeywords();
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
            loadKeywords()
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
