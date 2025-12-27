import { noteService } from "@/services/note.service";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { Note } from "@/types/note.types";
import { collectIdsFromTabs, generateTempId, generateUnsavedName, transformNotes } from "../../utils";
import { useSnackbar } from "notistack";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/types/editor/tab.types";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useEditorTabsStore, useNavigationHistoryStore, useStandardRegistryStore } from "@/store/index";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { filterUtils } from "@/utils/filter.utils";

export const useNoteGridHelper = () => {
    const { $user } = useAuthStore();

    const { notes, setNotes, setNoteGridIsLoading, setNoteGridError, noteGridRowSelection, setNoteGridRowSelection } = useNoteGridStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const { openTab, processTabAfterDelete } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setShouldFocusNoteName } = useNoteDetailStore();
    const { registries } = useStandardRegistryStore();

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
            userId: $user.userId || 0,
            description: "",
            hashtags: [],
            statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
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
    const __deleteRestore_SelectedNotes = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(noteGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        // Separate temporary notes (negative IDs) from persisted notes (positive IDs)
        const tempNoteIds = selectedIds.filter((id) => id < 0);
        const persistedNoteIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            // Handle temporary notes - only for delete (remove from grid locally)
            if (type === "soft-delete" && tempNoteIds.length > 0) {
                setNotes((prevNotes) => prevNotes.filter((note) => !tempNoteIds.includes(note.id)));

                enqueueSnackbar(`Removed ${tempNoteIds.length} unsaved note(s)`, {
                    variant: "success",
                });
            }

            // Determine deletedAt value based on action
            const deletedAt = type === "soft-delete" ? new Date().toISOString() : null;
            // Handle persisted notes - call API
            if (persistedNoteIds.length > 0) {
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
                        statusCode: note.statusCode,
                    };
                });

                // Call batch upsert API
                const result = await noteService._upsertNotes(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} notes`);
                }

                enqueueSnackbar(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedNoteIds.length} note(s)`, { variant: "success" });

                if(type === "soft-delete") {
                    // Process tabs and navigation history
                    processTabAfterDelete(persistedNoteIds, "note");
                }

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
            const token = $user.userToken;

            if (persistedNoteIds.length > 0) {
                // Use DELETE API (permanently remove)
                const result = await noteService._deleteNote(token, persistedNoteIds.join(","));

                if (!result.success) {
                    throw new Error(result.message || "Failed to hard delete notes");
                }

                enqueueSnackbar(`Successfully permanently deleted ${persistedNoteIds.length} note(s)`, {
                    variant: "success",
                });

                processTabAfterDelete(persistedNoteIds, "note");

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
            onSoftDelete: () => __deleteRestore_SelectedNotes(selectedIds, "soft-delete"),
            onHardDelete: () => __hardDeleteSelectedNotes(selectedIds),
            onRestore: () => __deleteRestore_SelectedNotes(selectedIds, "restore"),
            onAddNote: __createNewNote,
        });
    };
    // =============================================================================
    // =============================================================================

    // Load notes with filters from user state
    const loadNotes = async () => {
        try {
            setNoteGridIsLoading(true);
            const token = $user.userToken;

            // Get filters from user state
            const noteGridFilters = $user.filters?.noteGrid;

            // Parse date range filters
            const createdAtRange = filterUtils._parseDateRange(noteGridFilters?.createdAt);

            // Build filter params for API
            const filterParams = {
                statusCode: noteGridFilters?.statusCode,
                deletedAt: noteGridFilters?.deletedAt,
                createdAtFrom: createdAtRange.from,
                createdAtTo: createdAtRange.to,
            };

            const result = await noteService._getNotes(token, filterParams);

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || "Failed to load notes");
            }

            // Transform dates from API strings to Date objects
            const transformedData = transformNotes(result.data || []);
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
