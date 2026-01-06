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
import { useTreeEditorHelper } from "@/hooks/vsCode/useTreeEditorHelper";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { noteService } from "@/services/note.service";
import { parseKeywordLink, getHeadingAnchor } from "@/utils/keyword-link.utils";
import { constants } from "@/utils/constants";
import { WorkspaceItemAction } from "@/types/workspace.types";
import { Note } from "@/types/note.types";
import { WorkspaceNoteItem, WorkspaceFolderItem } from "@/types/workspace-v2.types";
import { WorkspaceDTO } from "@/types/workspace-dto.types";
import { BaseTab } from "@/types/editor/tab.types";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef } = useWorkspaceStore();
    const { openTabs } = useEditorTabsStore();
    const { openTab } = useEditorTabHelper();
    const { upsertWorkspaceItem } = useTreeEditorHelper();
    const { loadTree } = useWorkspaceLoader();
    const { enqueueSnackbar } = useSnackbar();

    /**
     * Navigate to keyword link (note, heading, external)
     */
    const navigateLink = useCallback(
        async (link: string) => {
            try {
                // Parse link
                const parsed = parseKeywordLink(link);

                if (!parsed) {
                    console.warn("Invalid keyword link:", link);
                    return;
                }

                // Handle external links
                if (parsed.type === "external" && parsed.url) {
                    window.open(parsed.url, "_blank", "noopener,noreferrer");
                    return;
                }

                // Variable to hold target workspace data after switch
                let targetWorkspace: WorkspaceDTO | null = currentWorkspace;

                // Save unsaved notes if navigating to different workspace
                if (parsed.workspaceId && currentWorkspace?.id !== parsed.workspaceId) {
                    const unsavedTabs = openTabs.filter((tab: BaseTab) => {
                        if (tab.type !== constants.vscode.tab.tabTypes.note) return false;
                        const note = tab.data as Note;
                        const belongsToCurrentWorkspace = currentWorkspace && findNoteByEntityId(currentWorkspace, note.id);
                        return belongsToCurrentWorkspace && note.id < 0;
                    });

                    if (unsavedTabs.length > 0) {
                        enqueueSnackbar(`Saving ${unsavedTabs.length} unsaved note(s)...`, { variant: "info" });
                        try {
                            const tabIdsToSave = unsavedTabs.map(tab => tab.id);
                            const saveSuccess = await upsertWorkspaceItem(WorkspaceItemAction.Create, tabIdsToSave);
                            
                            if (!saveSuccess) {
                                enqueueSnackbar("Failed to save notes. Navigation cancelled.", { variant: "error" });
                                return;
                            }
                        } catch (error) {
                            console.error("Failed to save tabs:", error);
                            enqueueSnackbar("Failed to save notes. Navigation cancelled.", { variant: "error" });
                            return;
                        }
                    }

                    // Switch to target workspace and load tree directly
                    setSelectedWorkspaceId(parsed.workspaceId);
                    enqueueSnackbar("Switching workspace...", { variant: "info" });
                    
                    // Load tree directly with target workspace ID
                    const loadedWorkspace = await loadTree(undefined, parsed.workspaceId);
                    if (!loadedWorkspace) {
                        enqueueSnackbar("Failed to load workspace", { variant: "error" });
                        return;
                    }
                    targetWorkspace = loadedWorkspace;
                }

                // Handle workspace navigation
                if (parsed.type === "workspace" && parsed.workspaceId) {
                    enqueueSnackbar("Switched workspace successfully", { variant: "success" });
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

                        enqueueSnackbar("Navigated to folder", { variant: "success" });
                    } else {
                        enqueueSnackbar("Folder not found in workspace", { variant: "warning" });
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
                            type: "idea",
                            statusCode: noteInWorkspace.data.statusCode,
                            createdAt: new Date(noteInWorkspace.data.createdAt),
                            updatedAt: noteInWorkspace.data.updatedAt ? new Date(noteInWorkspace.data.updatedAt) : undefined,
                            createdBy: "You",
                            deletedAt: noteInWorkspace.data.deletedAt ? new Date(noteInWorkspace.data.deletedAt) : null,
                            userId: noteInWorkspace.data.userId,
                        };

                        openTab(note, constants.vscode.tab.tabTypes.note);

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
                            enqueueSnackbar("Note not found", { variant: "warning" });
                        }
                    }
                }
            } catch (error) {
                console.error("Error navigating to keyword:", error);
                enqueueSnackbar("Failed to navigate to keyword", { variant: "error" });
            }
        },
        [currentWorkspace, $user, openTab, enqueueSnackbar, openTabs, upsertWorkspaceItem, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef, loadTree]
    );


    return {
        navigateLink,
    };
};

/**
 * Find folder in workspace by workspaceId and folderWorkspaceItemId
 */
function findFolderInWorkspace(workspace: any, workspaceId: number, folderWorkspaceItemId: number): WorkspaceFolderItem | null {
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
function findNoteByEntityId(workspace: any, noteEntityId: number): WorkspaceNoteItem | null {
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
