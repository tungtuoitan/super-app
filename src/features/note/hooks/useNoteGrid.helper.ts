import { noteService } from "../service/note.service";
import { useNoteDetailStore } from "../store/useNoteDetail.store";
import { useNoteGridStore } from "../store/useNoteGrid.store";
import { transformNotes } from "../utils/note.utils";
import { Note } from "../types/note.types";
import { collectIdsFromTabs, generateTempId, generateUnsavedName } from "@/utils/temp-id.utils";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/shell/types/tab.types";
import { useAuthStore } from "@/shell/store/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import { filterUtils } from "@/utils/filter.utils";
import { useGridControlStore } from "@/shared/store/useGridControl.store";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";
import {useGeneralStore} from "@/shared/store/General.store";

export const useNoteGridHelper = () => {
    const { $user } = useAuthStore();
    const { searchQuery } = useGridControlStore();

    const { notes, setNotes, setNoteGridIsLoading, setNoteGridError, noteGridRowSelection, setNoteGridRowSelection, noteGridPagination, setNoteGridPagination, setTotalCount } = useNoteGridStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const { openTab, processTabAfterDelete } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const _console = useConsoleHelper();
    const { setShouldFocusNoteName } = useNoteDetailStore();
    const { registries } = useGeneralStore();

    // Create new note (temporary with negative ID)
    const __createNewNote = () => {
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        const newNote: Note = {
            id: tempId,
            name: name,
            userId: $user.userId || 0,
            description: "",
            hashtags: "",
            statusCode: constants.standardRegistryFE.activeStatus.active,
            type: "idea",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "You",
            deletedAt: null,
        };

        setNotes([newNote, ...notes]);
        openTab(newNote, constants.vscode.tab.tabTypes.note);
        setShouldFocusNoteName(true);
    };

    /**
     * Toggle delete/restore for selected notes (soft delete)
     */
    const __deleteRestore_SelectedNotes = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        const selectedIds = ids ?? Object.keys(noteGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        const tempNoteIds = selectedIds.filter((id) => id < 0);
        const persistedNoteIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            if (type === "soft-delete" && tempNoteIds.length > 0) {
                setNotes((prevNotes) => prevNotes.filter((note) => !tempNoteIds.includes(note.id)));
                _console.success(`Removed ${tempNoteIds.length} unsaved note(s)`);
            }

            const deletedAt = type === "soft-delete" ? new Date().toISOString() : null;

            if (persistedNoteIds.length > 0) {
                const batchRequests = persistedNoteIds.map((id) => {
                    const note = notes.find((n) => n.id === id);
                    if (!note) {
                        throw new Error(`Note ${id} not found`);
                    }

                    return {
                        id: note.id,
                        name: note.name,
                        description: note.description,
                        type: note.type,
                        icon: note.icon,
                        color: note.color,
                        deletedAt: deletedAt,
                        statusCode: note.statusCode,
                    };
                });

                const result = await noteService._upsertNotes(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} notes`);
                }

                _console.success(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedNoteIds.length} note(s)`);

                if(type === "soft-delete") {
                    processTabAfterDelete(persistedNoteIds, "note");
                }

                await loadNotes();
            }

            setNoteGridRowSelection({});
        } catch (error) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} notes:`, error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} notes: ${errorMessage}`);
            }
        }
    };

    /**
     * Permanently delete selected notes (hard delete)
     */
    const __hardDeleteSelectedNotes = async (ids?: number[]) => {
        const selectedIds = ids ?? Object.keys(noteGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        const persistedNoteIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            if (persistedNoteIds.length > 0) {
                const result = await noteService._deleteNote(token, persistedNoteIds.join(","));

                if (!result.success) {
                    throw new Error(result.message || "Failed to hard delete notes");
                }

                _console.success(`Successfully permanently deleted ${persistedNoteIds.length} note(s)`);

                processTabAfterDelete(persistedNoteIds, "note");

                await loadNotes();
            }

            setNoteGridRowSelection({});
        } catch (error) {
            console.error("Failed to hard delete notes:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to permanently delete notes: ${errorMessage}`);
            }
        }
    };

    const openNoteContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds = Object.keys(noteGridRowSelection).map((id) => parseInt(id));

        if (selectedIds.length === 0 && row) {
            selectedIds = [parseInt(row.id)];
        }

        const selectedNotes = [...notes]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .filter((note) => selectedIds.includes(note.id));
        showContextMenu(event, "note-grid", {
            selectedNotes,
            selectedIds,
            onSoftDelete: () => __deleteRestore_SelectedNotes(selectedIds, "soft-delete"),
            onHardDelete: () => __hardDeleteSelectedNotes(selectedIds),
            onRestore: () => __deleteRestore_SelectedNotes(selectedIds, "restore"),
            onAddNote: __createNewNote,
        });
    };

    // Load notes with filters from user state
    const loadNotes = async () => {
        try {
            setNoteGridIsLoading(true);
            const token = $user.userToken;

            const noteGridFilters = $user.filters?.noteGrid;

            const createdAtRange = filterUtils._parseDateRange(noteGridFilters?.createdAt);

            const filterParams = {
                searchText: searchQuery || undefined,
                statusCode: noteGridFilters?.statusCode,
                deletedAt: noteGridFilters?.deletedAt,
                createdAtFrom: createdAtRange.from,
                createdAtTo: createdAtRange.to,
                page: noteGridPagination.pageIndex + 1,
                pageSize: noteGridPagination.pageSize,
            };

            const result = await noteService._getNotes(token, filterParams);

            if (!result.success) {
                throw new Error(result.message || "Failed to load notes");
            }

            const transformedData = transformNotes(result.data || []);
            setNotes(transformedData);
            setTotalCount(result.totalCount || transformedData.length);
            setNoteGridError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setNoteGridError(new Error(errorMessage));

            if (isUnauthorizedError(err)) {
                _console.success("Unauthorized. Please login again.");
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
