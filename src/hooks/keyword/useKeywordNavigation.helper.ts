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
import { noteService } from "@/services/note.service";
import { parseKeywordLink } from "@/utils/keyword-link.utils";
import { constants } from "@/utils/constants";
import { Note } from "@/types/note.types";
import { WorkspaceNoteItem, WorkspaceFolderItem } from "@/types/workspace-v2.types";
import { WorkspaceDTO } from "@/types/workspace-dto.types";
import { Keyword } from "@/types/keyword.types";
import { isValidUrl } from "@/utils/url.utils";
import { useWorkspaceHelper } from "../workspace/useWorkspaceHelper";
import { useConsoleHelper } from "../console/useConsole.helper";
import { treeMiniHelper } from "../workspace/tree.miniHelper";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef, setIsLoadingTreeByOpeningFolder } = useWorkspaceStore();
    const { openTabs } = useEditorTabsStore();
    const { openTab } = useEditorTabHelper();
    const { upsertWorkspaceItem } = useWorkspaceItemHelper();
    const { loadTree } = useWorkspaceLoader();
    const _console = useConsoleHelper();
    const { moduleName } = useGridControlStore();
    const { navigateToView } = useNavigationStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();

    const navigateLink = useCallback(
        async (keyword: Keyword) => {
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

                // Project navigation
                if (parsed.type === "project" && parsed.projectId) {
                    if (moduleName !== constants.modules.project) {
                        navigateToView(constants.vscode.viewTypes.project);
                    }
                    // TODO: select specific project by parsed.projectId in project store
                    _console.info(`Navigating to project ${parsed.projectId}`);
                    return;
                }

                // Task navigation
                if (parsed.type === "task" && parsed.taskId) {
                    if (moduleName !== constants.modules.project) {
                        navigateToView(constants.vscode.viewTypes.project);
                    }
                    // TODO: select project parsed.projectId, then open task parsed.taskId
                    _console.info(`Navigating to task ${parsed.taskId} in project ${parsed.projectId}`);
                    return;
                }

                // Log navigation
                if (parsed.type === "log" && parsed.logId) {
                    if (moduleName !== constants.modules.lifeLog) {
                        navigateToView(constants.vscode.viewTypes.lifeLog);
                    }
                    // TODO: select specific log by parsed.logId in log store
                    _console.info(`Navigating to log ${parsed.logId}`);
                    return;
                }

                // Track navigation
                if (parsed.type === "track" && parsed.trackId) {
                    if (moduleName !== constants.modules.lifeLog) {
                        navigateToView(constants.vscode.viewTypes.lifeLog);
                    }
                    // TODO: select specific track by parsed.trackId in log store
                    _console.info(`Navigating to track ${parsed.trackId}`);
                    return;
                }

                // Workspace-based navigation (workspace / folder / note)
                if (!parsed.workspaceId) return;

                if (moduleName !== constants.modules.workspace) {
                    navigateToView(constants.vscode.viewTypes.workspace);
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

                        openTab(note, constants.vscode.tab.tabTypes.note);
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
                            openTab(note, constants.vscode.tab.tabTypes.note);
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
