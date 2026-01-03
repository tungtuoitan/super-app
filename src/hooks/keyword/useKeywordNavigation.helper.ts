/**
 * Hook for handling keyword navigation in markdown editor
 * Navigates to notes/headings when clicking on keywords
 */

import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { noteService } from "@/services/note.service";
import { parseKeywordLink, getHeadingAnchor } from "@/utils/keyword-link.utils";
import { constants } from "@/utils/constants";
import { Note } from "@/types/note.types";
import { WorkspaceNoteItem } from "@/types/workspace-v2.types";
import {WorkspaceDTO} from "@/types/workspace-dto.types";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { openTab } = useEditorTabHelper();
    const { enqueueSnackbar } = useSnackbar();

    /**
     * Navigate to keyword link (note, heading, external)
     */
    const navigateToKeyword = useCallback(
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

            // Handle workspace/folder links (not implemented yet)
            if (parsed.type === "workspace" || parsed.type === "folder") {
                enqueueSnackbar("Navigation to workspace/folder not implemented yet", {
                    variant: "info",
                });
                return;
            }

            // Handle note/heading links
            if ((parsed.type === "note" || parsed.type === "heading") && parsed.noteWorkspaceItemId) {
                // Try to find note in current workspace
                const noteInWorkspace = findNoteInWorkspace(currentWorkspace, parsed.workspaceId!, parsed.noteWorkspaceItemId);

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
    [currentWorkspace, $user, openTab, enqueueSnackbar]
);

    return {
        navigateToKeyword,
    };
};

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
