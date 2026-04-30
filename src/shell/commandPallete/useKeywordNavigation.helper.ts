/**
 * Hook for handling keyword navigation in markdown editor
 */

import { useWorkspaceStore } from "@/features/workspace";
import { useAuthStore } from "@/shared";
import { useEditorTabHelper } from "../hooks/useEditorTab.helper";
import { useEditorTabBarStore } from "../store/EditorTab.store";
import { useGridControlStore } from "@/shared";
import { noteService } from "@/features/note";
import { parseKeywordLink, constants, isValidUrl } from "@/shared";
import type { Keyword } from "@/shared";
import { Note } from "@/features/note";
import { useWorkspaceLoader } from "@/features/workspace";
import { WorkspaceNoteItem, WorkspaceFolderItem } from "@/features/workspace";
import { WorkspaceDTO } from "@/features/workspace";
import { treeMiniHelper } from "@/features/workspace";
import { useWorkspaceHelper } from "@/features/workspace";
import { useConsoleHelper } from "@/shared";
import { keywordNavigatorRegistry } from "./keywordNavigator.registry";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef, setIsLoadingTreeByOpeningFolder } = useWorkspaceStore();
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const { openTab, updateActiveTab } = useEditorTabHelper();
    const { loadTree } = useWorkspaceLoader();
    const { setModuleName } = useGridControlStore();
    const _console = useConsoleHelper();
    const { moduleName } = useGridControlStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();

    const navigateLink = async (keyword: Keyword, openedBy?: { link: string; label: string }) => {
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

            // Feature-owned types: delegate to registered plugins
            const ctx = {
                userToken: $user.userToken,
                openTabs,
                openTab,
                updateActiveTab,
                setOpenTabs,
                log: {
                    error: _console.error,
                    success: _console.success,
                    info: _console.info,
                },
            };
            const handled = await keywordNavigatorRegistry.navigate(keyword, openedBy, ctx);
            if (handled) return;

            // Workspace-based navigation (workspace / folder / note)
            if (!parsed.workspaceId) return;

            if (moduleName !== constants.modules.workspace) {
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
    };

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
