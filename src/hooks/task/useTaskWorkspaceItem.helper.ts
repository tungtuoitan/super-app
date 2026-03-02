/**
 * Task Workspace Item Helper
 * Business logic for linking/unlinking workspace items (notes) to tasks
 */

import { useState, useCallback } from "react";
import { taskWorkspaceItemService, TaskWorkspaceItemDTO } from "@/services/taskWorkspaceItem.service";
import { noteService } from "@/services/note.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useConsoleHelper } from "../console/useConsole.helper";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { NoteDTO } from "@/types/note.types";
import type { Note } from "@/types/note.types";
import { useTaskStore, type Task } from "@/store/task/useTask.store";
import { useGeneralStore } from "@/store/index";
import { useEditorTabsStore } from "@/store/index";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { generateTempId, generateUnsavedName } from "@/utils/temp-id.utils";
import { constants } from "@/utils/constants";

export interface LinkedNote {
    linkId: number; // TaskWorkspaceItem.id
    workspaceItemId: number;
    itemType: number;
    noteId: number; // resolved from note lookup
    name: string;
    icon?: string;
    color?: string;
}

export interface LinkableNote {
    noteId: number;
    workspaceItemId: number;
    name: string;
}

export const useTaskWorkspaceItemHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { registries } = useGeneralStore();
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();
    const { setShouldFocusNoteName } = useNoteDetailStore();

    const [linkedNotes, setLinkedNotes] = useState<LinkedNote[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Load linked workspace items for a task, then resolve note details
     */
    const loadLinkedNotes = useCallback(async (taskId: number) => {
        if (taskId <= 0) {
            setLinkedNotes([]);
            return;
        }

        setIsLoading(true);
        try {
            const token = $user.userToken;
            const result = await taskWorkspaceItemService._getTaskWorkspaceItems(token, taskId);

            if (!result.success || !result.data || result.data.length === 0) {
                setLinkedNotes([]);
                return;
            }

            // Filter only notes (itemType=3)
            const noteLinks = result.data.filter((item) => item.itemType === 3);

            if (noteLinks.length === 0) {
                setLinkedNotes([]);
                return;
            }

            // Fetch note details by workspaceItemIds
            const wsItemIds = noteLinks.map((l) => l.workspaceItemId).join(",");
            const notesResult = await noteService._getNotes(token, {
                workspaceItemIds: wsItemIds,
                pageSize: noteLinks.length,
            });

            // Build linked notes with resolved names
            const noteMap = new Map<number, NoteDTO>();
            if (notesResult.success && notesResult.data) {
                // Map by note id for quick lookup
                for (const n of notesResult.data) {
                    noteMap.set(n.id, n);
                }
            }

            const resolved: LinkedNote[] = noteLinks.map((link) => {
                // Try to find note by matching workspace item id through the notes' workspaceLinks
                let matchedNote: NoteDTO | undefined;
                for (const n of noteMap.values()) {
                    if (n.workspaceLinks?.some((wl) => wl.workspaceItemId === link.workspaceItemId)) {
                        matchedNote = n;
                        break;
                    }
                }

                return {
                    linkId: link.id,
                    workspaceItemId: link.workspaceItemId,
                    itemType: link.itemType,
                    noteId: matchedNote?.id ?? 0,
                    name: matchedNote?.name ?? `Note (item #${link.workspaceItemId})`,
                    icon: matchedNote?.icon,
                    color: matchedNote?.color,
                };
            });

            setLinkedNotes(resolved);
        } catch (error) {
            console.error("Failed to load linked notes:", error);
            setLinkedNotes([]);
        } finally {
            setIsLoading(false);
        }
    }, [$user.userToken]);

    /**
     * Unlink a workspace item from a task
     */
    const unlinkNote = useCallback(async (taskId: number, linkId: number) => {
        try {
            const token = $user.userToken;
            const result = await taskWorkspaceItemService._unlinkTaskWorkspaceItem(token, taskId, linkId);

            if (result.success) {
                setLinkedNotes((prev) => prev.filter((n) => n.linkId !== linkId));
                _console.success("Note unlinked from task");
            } else {
                throw new Error(result.message || "Failed to unlink note");
            }
        } catch (error) {
            console.error("Failed to unlink note:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to unlink note: ${errorMessage}`);
            }
        }
    }, [$user.userToken, _console]);

    /**
     * Link a workspace item (note) to a task
     */
    const linkNote = useCallback(async (taskId: number, workspaceItemId: number, itemType: number = 3) => {
        try {
            const token = $user.userToken;
            const result = await taskWorkspaceItemService._linkTaskWorkspaceItem(token, taskId, {
                workspaceItemId,
                itemType,
            });

            if (result.success) {
                _console.success("Note linked to task");
                // Reload to get full resolved data
                await loadLinkedNotes(taskId);
            } else {
                throw new Error(result.message || "Failed to link note");
            }
        } catch (error) {
            console.error("Failed to link note:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to link note: ${errorMessage}`);
            }
        }
    }, [$user.userToken, _console, loadLinkedNotes]);

    /**
     * Load notes that can be linked to a task (notes with workspaceLinks)
     * Returns notes with their workspaceItemId for linking
     */
    const loadLinkableNotes = useCallback(async (searchText?: string): Promise<LinkableNote[]> => {
        try {
            const token = $user.userToken;
            const result = await noteService._getNotes(token, {
                searchText,
                deletedAt: "null",
                pageSize: 50,
            });

            if (!result.success || !result.data) return [];

            // Only include notes that have at least one workspaceLink
            const linkable: LinkableNote[] = [];
            for (const note of result.data) {
                if (note.workspaceLinks && note.workspaceLinks.length > 0) {
                    linkable.push({
                        noteId: note.id,
                        workspaceItemId: note.workspaceLinks[0].workspaceItemId,
                        name: note.name,
                    });
                }
            }
            return linkable;
        } catch (error) {
            console.error("Failed to load linkable notes:", error);
            return [];
        }
    }, [$user.userToken]);

    /**
     * Create a new note for a task.
     * Opens a bare note tab with metadata so upsertOrchestraitor knows
     * to create the workspace folder+item on save.
     */
    const createTaskNote = useCallback((task: Task, projectWorkspaceId: number | null | undefined) => {
        // Generate a unique temp note ID
        const existingIds = openTabs
            .filter((t) => t.type === constants.vscode.tab.tabTypes.note)
            .map((t) => (t.data as Note).id);
        const tempNoteId = generateTempId(existingIds);
        const name = generateUnsavedName(tempNoteId);

        const newNote: Note = {
            id: tempNoteId,
            name,
            userId: $user.userId || 0,
            description: "",
            hashtags: "",
            statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
            // type: "idea",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: $user.userName || "Unknown",
            deletedAt: null,
        };

        const tabId = `note-${tempNoteId}-${Date.now()}`;
        const newTab = {
            id: tabId,
            type: constants.vscode.tab.tabTypes.note,
            data: newNote,
            data0: newNote,
            title: name,
            hasUnsavedChanges: false,
            metadata: {
                taskId: task.id,
                taskTitle: task.title,
                projectWorkspaceId: projectWorkspaceId ?? null,
            },
        };

        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);
        setShouldFocusNoteName(true);
    }, [$user, registries, openTabs, setOpenTabs, setActiveTabId, setShouldFocusNoteName]);

    return {
        linkedNotes,
        isLoading,
        loadLinkedNotes,
        linkNote,
        unlinkNote,
        loadLinkableNotes,
        createTaskNote,
    };
};
