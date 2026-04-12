/**
 * Hook for handling keyword navigation in markdown editor
 */

import { useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useWorkspaceItemHelper } from "@/hooks/workspace/useWorkspaceItemHelper";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useNavigationStore } from "@/contexts/NavigationContext";
import { noteService } from "@/features/note/service/note.service";
import { parseKeywordLink } from "@/utils/keyword-link.utils";
import { constants } from "@/utils/constants";
import { Note } from "@/features/note/types/note.types";
import { WorkspaceNoteItem, WorkspaceFolderItem } from "@/types/workspace-v2.types";
import { WorkspaceDTO } from "@/types/workspace-dto.types";
import { Keyword } from "@/types/keyword.types";
import { isValidUrl } from "@/utils/url.utils";
import { useWorkspaceHelper } from "../workspace/useWorkspaceHelper";
import { useConsoleHelper } from "../console/useConsole.helper";
import { treeMiniHelper } from "../workspace/tree.miniHelper";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { lifeLogService } from "@/services/lifeLog.service";
import { useProjectStore } from "@/store/project/useProject.store";
import { useTaskStore } from "@/store/task/useTask.store";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import type { Project } from "@/store/project/useProject.store";
import type { Task } from "@/store/task/useTask.store";
import type { LifeLogLog, LifeLogTrack } from "@/types/lifeLog.types";

import { targetKeywordService } from "@/services/targetKeyword.service";
import type { TargetKeywordTargetType } from "@/services/targetKeyword.service";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef, setIsLoadingTreeByOpeningFolder } = useWorkspaceStore();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { openTab, updateActiveTab } = useEditorTabHelper();
    const { upsertWorkspaceItem } = useWorkspaceItemHelper();
    const { loadTree } = useWorkspaceLoader();
    const { setModuleName } = useGridControlStore();
    const _console = useConsoleHelper();
    const { moduleName } = useGridControlStore();
    const { navigateToView } = useNavigationStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();
    const { projects } = useProjectStore();
    const { tasks } = useTaskStore();
    const { logs, tracks } = useLifeLogStore();

    const navigateLink = useCallback(
        async (keyword: Keyword, openedBy?: { link: string; label: string }) => {
            try {
                const parsed = parseKeywordLink(keyword);

                if (!parsed) {
                    console.warn("Invalid keyword link:", keyword.link);
                    return;
                }

                // External links
                if (parsed.type === "external" && parsed.url) {
                    const url = parsed.url.startsWith("http") ? parsed.url : `https://${parsed.url}`;
                    if (isValidUrl(url)) {
                        window.open(url, "_blank", "noopener,noreferrer");
                    } else {
                        _console.error(`Invalid URL: ${url}`);
                    }
                    return;
                }

                // Project — check openTabs, then state, then API
                if (parsed.type === "project" && parsed.projectId) {
                    try {
                        const existingProjectTab = openTabs.find(
                            (tab) => tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === parsed.projectId
                        );
                        if (existingProjectTab) {
                            if (openedBy) {
                                setOpenTabs(prev => prev.map(t => t.id === existingProjectTab.id ? { ...t, openedBy } : t));
                            }
                            updateActiveTab(existingProjectTab.id);
                            return;
                        }

                        const project = projects.find((p) => p.id === parsed.projectId);
                        if (project) {
                            openTab(project, constants.vscode.tab.tabTypes.project, openedBy);
                            return;
                        }

                        const result = await projectService._getProjectById($user.userToken, parsed.projectId);
                        if (result.success && result.data?.[0]) {
                            const dto = result.data[0];
                            const project: Project = {
                                id: dto.id,
                                name: dto.name,
                                description: dto.description,
                                status: dto.status,
                                startDate: dto.startDate ? new Date(dto.startDate) : null,
                                endDate: dto.endDate ? new Date(dto.endDate) : null,
                                createdAt: new Date(dto.createdAt),
                                updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
                                deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                                workspaceId: dto.workspaceId,
                            };
                            openTab(project, constants.vscode.tab.tabTypes.project, openedBy);
                        } else {
                            _console.error("Project not found");
                        }
                    } catch {
                        _console.error("Failed to load project");
                    }
                    return;
                }

                // Task — check openTabs, then state, then API
                if (parsed.type === "task" && parsed.taskId) {
                    try {
                        const existingTaskTab = openTabs.find(
                            (tab) => tab.type === constants.vscode.tab.tabTypes.task && (tab.data as Task).id === parsed.taskId
                        );
                        if (existingTaskTab) {
                            if (openedBy) {
                                setOpenTabs(prev => prev.map(t => t.id === existingTaskTab.id ? { ...t, openedBy } : t));
                            }
                            updateActiveTab(existingTaskTab.id);
                            return;
                        }

                        const task = tasks.find((t) => t.id === parsed.taskId);
                        if (task) {
                            openTab(task, constants.vscode.tab.tabTypes.task, openedBy);
                            return;
                        }
                        const result = await taskService._getTaskById($user.userToken, parsed.taskId);
                        if (result.success && result.data?.[0]) {
                            const dto = result.data[0];
                            const task: Task = {
                                id: dto.id,
                                projectId: dto.projectId,
                                parentTaskId: dto.parentTaskId,
                                type: dto.type,
                                taskType: dto.taskType || "personal",
                                title: dto.title,
                                note: dto.note,
                                status: dto.status,
                                priority: dto.priority,
                                startDate: dto.startDate ? new Date(dto.startDate) : null,
                                endDate: dto.endDate ? new Date(dto.endDate) : null,
                                orderIndex: dto.orderIndex,
                                createdAt: new Date(dto.createdAt),
                                updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
                                deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                                folderWorkspaceItemId: dto.folderWorkspaceItemId,
                                checklistJson: dto.checklistJson ?? null,
                                processJson: dto.processJson ?? null,
                                customTabsJson: dto.customTabsJson ?? null,
                            };
                            openTab(task, constants.vscode.tab.tabTypes.task, openedBy);
                        } else {
                            _console.error("Task not found");
                        }
                    } catch {
                        _console.error("Failed to load task");
                    }
                    return;
                }

                // Log — check openTabs, then state, then API
                if (parsed.type === "log" && parsed.logId) {
                    try {
                        const existingLogTab = openTabs.find(
                            (tab) => tab.type === constants.vscode.tab.tabTypes.lifeLog && (tab.data as LifeLogLog).id === parsed.logId
                        );
                        if (existingLogTab) {
                            if (openedBy) {
                                setOpenTabs(prev => prev.map(t => t.id === existingLogTab.id ? { ...t, openedBy } : t));
                            }
                            updateActiveTab(existingLogTab.id);
                            return;
                        }

                        const log = logs.find((l) => l.id === parsed.logId);
                        if (log) {
                            openTab(log, constants.vscode.tab.tabTypes.lifeLog, openedBy);
                            return;
                        }
                        const result = await lifeLogService._getLogById($user.userToken, parsed.logId);
                        if (result.success && result.data?.[0]) {
                            const dto = result.data[0];
                            const log: LifeLogLog = {
                                id: dto.id,
                                userId: dto.userId,
                                type: dto.type as LifeLogLog["type"],
                                trackId: dto.trackId ?? undefined,
                                title: dto.title ?? undefined,
                                description: dto.description ?? undefined,
                                isSensitive: dto.isSensitive,
                                location: dto.location ?? undefined,
                                occurAt: dto.occurAt ? new Date(dto.occurAt) : undefined,
                                createdAt: new Date(dto.createdAt),
                                updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
                                deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                            };
                            openTab(log, constants.vscode.tab.tabTypes.lifeLog, openedBy);
                        } else {
                            _console.error("Log not found");
                        }
                    } catch {
                        _console.error("Failed to load log");
                    }
                    return;
                }

                // Track — check openTabs, then state, then API
                if (parsed.type === "track" && parsed.trackId) {
                    try {
                        const existingTrackTab = openTabs.find(
                            (tab) => tab.type === constants.vscode.tab.tabTypes.lifeLogTrack && (tab.data as LifeLogTrack).id === parsed.trackId
                        );
                        if (existingTrackTab) {
                            if (openedBy) {
                                setOpenTabs(prev => prev.map(t => t.id === existingTrackTab.id ? { ...t, openedBy } : t));
                            }
                            updateActiveTab(existingTrackTab.id);
                            return;
                        }

                        const track = tracks.find((t) => t.id === parsed.trackId);
                        if (track) {
                            openTab(track, constants.vscode.tab.tabTypes.lifeLogTrack, openedBy);
                            return;
                        }
                        const result = await lifeLogService._getTrackById($user.userToken, parsed.trackId);
                        if (result.success && result.data?.[0]) {
                            const dto = result.data[0];
                            const track: LifeLogTrack = {
                                id: dto.id,
                                userId: dto.userId,
                                name: dto.name,
                                emoji: dto.emoji,
                                description: dto.description,
                                isSensitive: dto.isSensitive,
                                color: dto.color,
                                createdAt: new Date(dto.createdAt),
                                updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
                                deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                            };
                            openTab(track, constants.vscode.tab.tabTypes.lifeLogTrack, openedBy);
                        } else {
                            _console.error("Track not found");
                        }
                    } catch {
                        _console.error("Failed to load track");
                    }
                    return;
                }

                // Workspace-based navigation (workspace / folder / note)
                if (!parsed.workspaceId) return;

                if (moduleName !== constants.modules.workspace) {
                    // navigateToView(constants.vscode.viewTypes.workspace);
                    setModuleName(constants.modules.workspace);
                }

                let targetWorkspace: WorkspaceDTO | null = currentWorkspace;

                if (currentWorkspace?.id !== parsed.workspaceId) {
                    const saveSuccess = await saveNewsBeforeNavigate();
                    if (!saveSuccess) return;

                    setSelectedWorkspaceId(parsed.workspaceId);
                    _console.info("Switching workspace...");

                    const loaded = await loadTree(undefined, parsed.workspaceId);
                    if (!loaded) {
                        _console.error("Failed to load workspace");
                        return;
                    }
                    targetWorkspace = loaded;
                }

                if (parsed.type === "workspace") {
                    _console.success("Switched workspace successfully");
                    return;
                }

                // Folder navigation
                if (parsed.type === "folder" && parsed.folderId) {
                    const folderItem = findFolderInWorkspace(targetWorkspace, parsed.workspaceId, parsed.folderId);

                    if (folderItem) {
                        setSelectedItemIds([folderItem.id]);
                        setLastSelectedItemId(folderItem.id);

                        if (_treeRef.current && targetWorkspace?.flatData) {
                            setIsLoadingTreeByOpeningFolder(true);
                            try {
                                const treeData = treeMiniHelper.transformToTreeData(targetWorkspace, "");
                                await treeMiniHelper.expandPathToItem(_treeRef, treeData, folderItem.id);
                            } finally {
                                setIsLoadingTreeByOpeningFolder(false);
                            }
                        }
                        _console.success("Navigated to folder");
                    } else {
                        _console.error("Folder not found in workspace");
                    }
                    return;
                }

                // Note navigation
                if (parsed.type === "note" && parsed.noteWorkspaceItemId) {
                    const noteItem = findNoteInWorkspace(targetWorkspace, parsed.workspaceId, parsed.noteWorkspaceItemId);

                    if (noteItem) {
                        const note: Note = {
                            id: noteItem.data.id,
                            name: noteItem.data.name,
                            description: noteItem.data.description || "",
                            hashtags: "",
                            statusCode: noteItem.data.statusCode,
                            createdAt: new Date(noteItem.data.createdAt),
                            updatedAt: noteItem.data.updatedAt ? new Date(noteItem.data.updatedAt) : undefined,
                            createdBy: $user.userName || "You",
                            deletedAt: noteItem.data.deletedAt ? new Date(noteItem.data.deletedAt) : null,
                            userId: noteItem.data.userId,
                        };

                        openTab(note, constants.vscode.tab.tabTypes.note, openedBy);
                        setSelectedItemIds([noteItem.id]);
                        setLastSelectedItemId(noteItem.id);

                        if (_treeRef.current && targetWorkspace?.flatData) {
                            setIsLoadingTreeByOpeningFolder(true);
                            try {
                                const treeData = treeMiniHelper.transformToTreeData(targetWorkspace, "");
                                await treeMiniHelper.expandPathToItem(_treeRef, treeData, noteItem.id);
                            } finally {
                                setIsLoadingTreeByOpeningFolder(false);
                            }
                        }
                    } else {
                        // Fetch from API by workspaceItemId
                        const result = await noteService._getNotes($user.userToken, {
                            workspaceItemIds: parsed.noteWorkspaceItemId.toString(),
                        });

                        if (result.success && result.data && result.data.length > 0) {
                            const noteData = result.data[0];
                            const note: Note = {
                                id: noteData.id,
                                name: noteData.name,
                                description: noteData.description || "",
                                hashtags: "",
                                type: noteData.type || "idea",
                                statusCode: noteData.statusCode,
                                createdAt: new Date(noteData.createdAt),
                                updatedAt: noteData.updatedAt ? new Date(noteData.updatedAt) : undefined,
                                createdBy: noteData.createdBy || "You",
                                deletedAt: noteData.deletedAt ? new Date(noteData.deletedAt) : null,
                                userId: noteData.userId,
                            };
                            openTab(note, constants.vscode.tab.tabTypes.note, openedBy);
                        } else {
                            _console.warning("Note not found");
                        }
                    }
                }
            } catch (error) {
                console.error("Error navigating to keyword:", error);
                _console.error("Failed to navigate to keyword");
            }
        },
        [
            currentWorkspace,
            $user,
            openTab,
            openTabs,
            upsertWorkspaceItem,
            setSelectedWorkspaceId,
            setSelectedItemIds,
            setLastSelectedItemId,
            _treeRef,
            setIsLoadingTreeByOpeningFolder,
            loadTree,
            moduleName,
            navigateToView,
        ]
    );

    return { navigateLink };
};

export function findFolderInWorkspace(workspace: any, workspaceId: number, folderWorkspaceItemId: number): WorkspaceFolderItem | null {
    if (!workspace || workspace.id !== workspaceId) return null;
    const item = workspace.flatData?.find(
        (item: any) => item.id === folderWorkspaceItemId && item.entityType === 2
    );
    return item as WorkspaceFolderItem | null;
}

function findNoteInWorkspace(workspace: any, workspaceId: number, noteWorkspaceItemId: number): WorkspaceNoteItem | null {
    if (!workspace || workspace.id !== workspaceId) return null;
    const item = workspace.flatData?.find(
        (item: any) => item.id === noteWorkspaceItemId && item.entityType === 3
    );
    return item as WorkspaceNoteItem | null;
}

export function findNoteByEntityId(workspace: any, noteEntityId: number): WorkspaceNoteItem | null {
    if (!workspace || noteEntityId < 0) {
        return noteEntityId < 0 ? ({} as WorkspaceNoteItem) : null;
    }
    const item = workspace.flatData?.find(
        (item: any) => item.data?.id === noteEntityId && item.entityType === 3
    );
    return item as WorkspaceNoteItem | null;
}
