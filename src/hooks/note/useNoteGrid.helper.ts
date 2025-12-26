import { noteService } from "@/services/note.service";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { Note } from "@/types/note.types";
import { collectIdsFromTabs, generateTempId, generateUnsavedName, transformNotesData } from "../../utils";
import { useSnackbar } from "notistack";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/types/editor/tab.types";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils"; 
import { useEditorTabsStore } from "@/store/index";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";

export const useNoteGridHelper = () => {
    const { auth } = useAuthStore();

    const { notes, setNotes, setNoteGridIsLoading, setNoteGridError, noteGridRowSelection, setNoteGridRowSelection } = useNoteGridStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const { openTab } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setShouldFocusNoteName } = useNoteDetailStore();

    // Create new note (temporary with negative ID)
    const __createNewNote = () => {
        // Generate sequential temporary negative ID from open tabs
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        // Create temporary note
        const newNote: Note = {
            id: tempId,
            name: name,
            description: "",
            hashtags: [],
            tags: [],
            type: "idea",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "You",
            deletedAt: null,
        };

        // Insert at the beginning of notes array
        setNotes([newNote, ...notes]);

        // Open note tab for editing
        openTab(newNote);

        // Focus vào Note Name field sau khi tab mở
        setShouldFocusNoteName(true);
    };

    /**
     * Toggle delete/restore for selected notes (soft delete)
     * - type = 'soft-delete': Set deletedAt timestamp (soft delete)
     * - type = 'restore': Clear deletedAt (restore)
     */
    const __toggleSelectedNotes = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(noteGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        // Separate temporary notes (negative IDs) from persisted notes (positive IDs)
        const tempNoteIds = selectedIds.filter((id) => id < 0);
        const persistedNoteIds = selectedIds.filter((id) => id > 0);

        try {
            const token = auth.userToken;

            // Handle temporary notes - only for delete (remove from grid locally)
            if (type === "soft-delete" && tempNoteIds.length > 0) {
                setNotes((prevNotes) => prevNotes.filter((note) => !tempNoteIds.includes(note.id)));

                enqueueSnackbar(`Removed ${tempNoteIds.length} unsaved note(s)`, {
                    variant: "success",
                });
            }

            // Handle persisted notes - call API
            if (persistedNoteIds.length > 0) {
                // Determine deletedAt value based on action
                const deletedAt = type === "soft-delete" ? new Date().toISOString() : null;

                // Build batch requests
                const batchRequests = persistedNoteIds.map((id) => {
                    const note = notes.find((n) => n.id === id);
                    if (!note) {
                        throw new Error(`Note ${id} not found`);
                    }

                    return {
                        id: note.id,
                        name: note.name,
                        description: note.description,
                        tags: note.hashtags?.map((h) => h.id),
                        type: note.type,
                        deletedAt: deletedAt, // Set or clear soft delete timestamp
                    };
                });

                // Call batch upsert API
                const result = await noteService._upsertNotes(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} notes`);
                }

                enqueueSnackbar(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedNoteIds.length} note(s)`, { variant: "success" });

                // Update opened tabs
                const updatedTabs = openTabs.map((tab: BaseTab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.note && persistedNoteIds.includes(tab.data.id)) {
                        const noteData = tab.data as Note;
                        return {
                            ...tab,
                            data: {
                                ...noteData,
                                deletedAt: type === "soft-delete" ? new Date() : null,
                            },
                        };
                    }
                    return tab;
                });
                setOpenTabs(updatedTabs);

                // Reload notes from API
                await loadNotes();
            }

            // Clear selection
            setNoteGridRowSelection({});
        } catch (error) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} notes:`, error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to ${type === "soft-delete" ? "delete" : "restore"} notes: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    /**
     * Permanently delete selected notes (hard delete)
     * Uses DELETE API to remove from database completely
     */
    const __hardDeleteSelectedNotes = async (ids?: number[]) => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(noteGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        // Only hard delete persisted notes (positive IDs)
        const persistedNoteIds = selectedIds.filter((id) => id > 0);

        try {
            const token = auth.userToken;

            if (persistedNoteIds.length > 0) {
                // Use DELETE API (permanently remove)
                const result = await noteService._deleteNote(token, persistedNoteIds.join(","));

                if (!result.success) {
                    throw new Error(result.message || "Failed to hard delete notes");
                }

                enqueueSnackbar(`Successfully permanently deleted ${persistedNoteIds.length} note(s)`, {
                    variant: "success",
                });

                // Mark opened tabs as hard deleted
                const updatedTabs = openTabs.map((tab: BaseTab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.note && persistedNoteIds.includes(tab.data.id)) {
                        const noteData = tab.data as Note;
                        return { ...tab, data: { ...noteData, deletedAt: new Date(), isHardDeleted: true } };
                    }
                    return tab;
                });
                setOpenTabs(updatedTabs);

                // Reload notes from API
                await loadNotes();
            }

            // Clear selection
            setNoteGridRowSelection({});
        } catch (error) {
            console.error("Failed to hard delete notes:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to permanently delete notes: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    // Handle context menu
    const openNoteContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds: number[];
        let selectedNotes: Note[] = [];

        // If row provided (clicked on a row)
        if (row) {
            // If row is not selected, add it to current selection
            if (!row.getIsSelected()) {
                // Add this row to existing selection
                setNoteGridRowSelection({ ...noteGridRowSelection, [row.id]: true });
                // Include this row in selectedIds along with existing selection
                selectedIds = [...Object.keys(noteGridRowSelection).map((id) => parseInt(id)), parseInt(row.id)];
            } else {
                // Row already selected, use current selection
                selectedIds = Object.keys(noteGridRowSelection).map((id) => parseInt(id));
            }

            selectedNotes = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).filter((note) => selectedIds.includes(note.id));
        } else {
            // Clicked on empty area
            selectedIds = [];
        }
        showContextMenu(event, "note-grid", {
            selectedNotes,
            selectedIds,
            onSoftDelete: () => __toggleSelectedNotes(selectedIds, "soft-delete"),
            onHardDelete: () => __hardDeleteSelectedNotes(selectedIds),
            onRestore: () => __toggleSelectedNotes(selectedIds, "restore"),
            onAddNote: __createNewNote,
        });
    };
    // =============================================================================
    // =============================================================================

    // Load notes
    const loadNotes = async () => {
        try {
            setNoteGridIsLoading(true);
            const token = auth.userToken;
            const result = await noteService._getNotes(token);

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || "Failed to load notes");
            }

            // Transform dates from API strings to Date objects
            const transformedData = transformNotesData(result.data || []);
            setNotes(transformedData);
            setNoteGridError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setNoteGridError(new Error(errorMessage));

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            }
        } finally {
            setNoteGridIsLoading(false);
        }
    };

    return {
        openNoteContextMenu,
        loadNotes,
    };
};
