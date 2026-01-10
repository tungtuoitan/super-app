/**
 * Hook for handling keyword navigation in markdown editor
 * Navigates to notes/headings when clicking on keywords
 */

import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useWorkspaceItemHelper } from "@/hooks/workspace/useWorkspaceItemHelper";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useNavigationStore } from "@/contexts/NavigationContext";
import { noteService } from "@/services/note.service";
import { parseKeywordLink, getHeadingAnchor } from "@/utils/keyword-link.utils";
import { constants } from "@/utils/constants";
import { WorkspaceItemAction } from "@/types/workspace.types";
import { Note } from "@/types/note.types";
import { WorkspaceNoteItem, WorkspaceFolderItem } from "@/types/workspace-v2.types";
import { WorkspaceDTO } from "@/types/workspace-dto.types";
import { BaseTab } from "@/types/editor/tab.types";
import { Keyword } from "@/types/keyword.types";
import { isValidUrl } from "@/utils/url.utils";
import {useWorkspaceHelper} from "../workspace/useWorkspaceHelper";
import {useConsoleHelper} from "../console/useConsole.helper";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef } = useWorkspaceStore();
    const { openTabs } = useEditorTabsStore();
    const { openTab } = useEditorTabHelper();
    const { upsertWorkspaceItem } = useWorkspaceItemHelper();
    const { loadTree } = useWorkspaceLoader();
    const _console = useConsoleHelper();
    const { moduleName } = useGridControlStore();
    const { navigateToView } = useNavigationStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();

    /**
     * Navigate to keyword link (note, heading, external)
     */
    const navigateLink = useCallback(
        async (keyword: Keyword) => {
            try {
                // Parse link
                const parsed = parseKeywordLink(keyword);

                if (!parsed) {
                    console.warn("Invalid keyword link:", keyword.link);
                    return;
                }

                // If current module is not workspace, navigate to workspace view first
                if (moduleName !== constants.modules.workspace) {
                    navigateToView(constants.vscode.viewTypes.workspace);
                }

                // Handle external links
                if (parsed.type === "external" && parsed.url) {
                    const _url = parsed.url.startsWith("http") ? parsed.url : `https://${parsed.url}`;
                    if (isValidUrl(_url)) {
                        window.open(_url, "_blank", "noopener,noreferrer");
                        return;
                    } else {
                        _console.error(`Invalid URL: ${_url}`);
                        return;
                    }
                }

                // Variable to hold target workspace data after switch
                let targetWorkspace: WorkspaceDTO | null = currentWorkspace;

                // Save unsaved notes if navigating to different workspace
                if (parsed.workspaceId && currentWorkspace?.id !== parsed.workspaceId) {
                    const saveSuccess = await saveNewsBeforeNavigate();

                    if (!saveSuccess) {
                        return;
                    }

                    // Switch to target workspace and load tree directly
                    setSelectedWorkspaceId(parsed.workspaceId);
                    _console.info("Switching workspace...");

                    // Load tree directly with target workspace ID
                    const loadedWorkspace = await loadTree(undefined, parsed.workspaceId);
                    if (!loadedWorkspace) {
                        _console.error("Failed to load workspace");
                        return;
                    }
                    targetWorkspace = loadedWorkspace;
                }

                // Handle workspace navigation
                if (parsed.type === "workspace" && parsed.workspaceId) {
                    _console.success("Switched workspace successfully");
                    return;
                }

                // Handle folder links
                if (parsed.type === "folder" && parsed.folderId) {
                    // Try to find folder in target workspace (after potential switch)
                    const folderInWorkspace = findFolderInWorkspace(targetWorkspace, parsed.workspaceId!, parsed.folderId);

                    if (folderInWorkspace) {
                        // Found folder - select it
                        setSelectedItemIds([folderInWorkspace.id]);
                        setLastSelectedItemId(folderInWorkspace.id);

                        // Expand folder if collapsed
                        if (!folderInWorkspace.isExpanded && _treeRef.current) {
                            const node = _treeRef.current.get(folderInWorkspace.id.toString());
                            if (node && !node.isOpen) {
                                node.open();
                            }
                        }

                        _console.success("Navigated to folder");
                    } else {
                        _console.error("Folder not found in workspace");
                    }
                    return;
                }

                // Handle note/heading links
                if ((parsed.type === "note" || parsed.type === "heading") && parsed.noteWorkspaceItemId) {
                    // Try to find note in target workspace (after potential switch)
                    const noteInWorkspace = findNoteInWorkspace(targetWorkspace, parsed.workspaceId!, parsed.noteWorkspaceItemId);

                    if (noteInWorkspace) {
                        // Found in workspace, open tab
                        const note: Note = {
                            id: noteInWorkspace.data.id,
                            name: noteInWorkspace.data.name,
                            description: noteInWorkspace.data.description || "",
                            hashtags: "",
                            statusCode: noteInWorkspace.data.statusCode,
                            createdAt: new Date(noteInWorkspace.data.createdAt),
                            updatedAt: noteInWorkspace.data.updatedAt ? new Date(noteInWorkspace.data.updatedAt) : undefined,
                            createdBy: $user.userName || "You",
                            deletedAt: noteInWorkspace.data.deletedAt ? new Date(noteInWorkspace.data.deletedAt) : null,
                            userId: noteInWorkspace.data.userId,
                        };

                        openTab(note, constants.vscode.tab.tabTypes.note);
                        //* Select note in workspace tree after a small delay (nếu k thì có bug: k select đc node)
                        setTimeout(() => {
                            setSelectedItemIds([noteInWorkspace.id]);
                            setLastSelectedItemId(noteInWorkspace.id);
                        });

                        // If heading, scroll to it after a small delay
                        if (parsed.type === "heading" && parsed.headingPath) {
                            const anchor = getHeadingAnchor(parsed.headingPath);
                            setTimeout(() => {
                                const element = document.getElementById(anchor);
                                if (element) {
                                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                            }, 300);
                        }
                    } else {
                        // Not found in current workspace, fetch from API using workspaceItemIds
                        const token = $user.userToken;
                        const result = await noteService._getNotes(token, {
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

                            // If heading, scroll to it
                            if (parsed.type === "heading" && parsed.headingPath) {
                                const anchor = getHeadingAnchor(parsed.headingPath);
                                setTimeout(() => {
                                    const element = document.getElementById(anchor);
                                    if (element) {
                                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }
                                }, 300);
                            }
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
            loadTree,
            moduleName,
            navigateToView,
        ]
    );

    return {
        navigateLink,
    };
};

/**
 * Find folder in workspace by workspaceId and folderWorkspaceItemId
 */
export function findFolderInWorkspace(workspace: any, workspaceId: number, folderWorkspaceItemId: number): WorkspaceFolderItem | null {
    if (!workspace || workspace.id !== workspaceId) {
        return null;
    }

    // Search in flatData
    const item = workspace.flatData?.find(
        (item: any) => item.id === folderWorkspaceItemId && item.entityType === 2 // 2 = folder
    );

    return item as WorkspaceFolderItem | null;
}

/**
 * Find note in workspace by workspaceId and noteWorkspaceItemId
 */
function findNoteInWorkspace(workspace: any, workspaceId: number, noteWorkspaceItemId: number): WorkspaceNoteItem | null {
    if (!workspace || workspace.id !== workspaceId) {
        return null;
    }

    // Search in flatData
    const item = workspace.flatData?.find(
        (item: any) => item.id === noteWorkspaceItemId && item.entityType === 3 // 3 = note
    );

    return item as WorkspaceNoteItem | null;
}

/**
 * Find note in workspace by entity ID (note.id from notes table)
 */
export function findNoteByEntityId(workspace: any, noteEntityId: number): WorkspaceNoteItem | null {
    if (!workspace || noteEntityId < 0) {
        // New notes (id < 0) are always considered as belonging to current workspace
        return noteEntityId < 0 ? ({} as WorkspaceNoteItem) : null;
    }

    // Search in flatData by entity ID
    const item = workspace.flatData?.find(
        (item: any) => item.data?.id === noteEntityId && item.entityType === 3 // 3 = note
    );

    return item as WorkspaceNoteItem | null;
}
