import {_deleteNote, _getNotes, _upsertNotesBatch} from '@/services/note.service';
import {useNoteDetailStore} from '@/store/note/useNoteDetail.store';
import { Note } from '@/types/note.types';
import {collectIdsFromTabs, generateTempId, generateUnsavedName, transformNotesData} from '../../utils';
import {useContextMenuStore, useEditorTabsStore} from '../../store';
import {useSnackbar} from 'notistack';
import {useEditorTabHelper} from '../vsCode/useEditorTab.helper';
import {useNoteGridStore} from '@/store/note/useNoteGrid.store';
import { constants } from '@/utils/constants';
import {BaseTab} from '@/types/editor/tab.types';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';

export const useNoteGridHelper = () => {
    const { auth } = useAuthStore();

    const {
        notes,
        setNotes,
        isLoading,
        setIsLoading,
        error,
        setError,
        sorting,
        setSorting,
        pagination,
        setPagination,
        rowSelection,
        setRowSelection,
    } = useNoteGridStore();
    
    const { openTab } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setIsContextMenuOpen, setAnchorPoint, setContextType, setContextData } = useContextMenuStore();
    const { setShouldFocusNoteName } = useNoteDetailStore();

    // Create new note (temporary with negative ID)
    const createNewNote = () => {

        // Generate sequential temporary negative ID from open tabs
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);
        
        // Create temporary note
        const newNote: Note = {
            id: tempId,
            name: name,
            description: '',
            hashtags: [],
            tags: [],
            type: 'idea',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'You',
            deletedAt: null,
        };

        // Insert at the beginning of notes array
        setNotes([newNote, ...notes]);

        // Open note tab for editing
        openTab(newNote);

        // Focus vào Note Name field sau khi tab mở
        setShouldFocusNoteName(true);
    };

    // Load notes
    const loadNotes = async () => {
        try {
            setIsLoading(true);
            const token = auth.userToken;
            const result = await _getNotes(token, { getAll: true });
            
            // Check API response success
            if (!result.success) {
                throw new Error(result.message || 'Failed to load notes');
            }
            
            // Transform dates from API strings to Date objects
            const transformedData = transformNotesData(result.data || []);
            setNotes(transformedData);
            setError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setError(new Error(errorMessage));

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            }
        } finally {
            setIsLoading(false);
        }
    };    
    
    /**
     * Delete selected notes (called from context menu after confirmation)
     * - Hard delete: Permanently remove from DB via DELETE API
     * - Soft delete: Set deletedAt via Upsert API
     */
    const deleteSelectedNotes = async (ids?: number[], isHardDelete: boolean = false) => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(rowSelection).map(id => parseInt(id));
        if (selectedIds.length === 0) return;

        // Separate temporary notes (negative IDs) from persisted notes (positive IDs)
        const tempNoteIds = selectedIds.filter(id => id < 0);
        const persistedNoteIds = selectedIds.filter(id => id > 0);

        try {
            const token = auth.userToken;

            // Handle temporary notes - just remove from grid locally
            if (tempNoteIds.length > 0) {
                setNotes(prevNotes => prevNotes.filter(note => !tempNoteIds.includes(note.id)));

                enqueueSnackbar(`Removed ${tempNoteIds.length} unsaved note(s)`, {
                    variant: 'success'
                });
            }

            // Handle persisted notes - call API
            if (persistedNoteIds.length > 0) {
                if (isHardDelete) {
                    // HARD DELETE: Use DELETE API (permanently remove)
                    const result = await _deleteNote(token, persistedNoteIds.join(','));

                    if (!result.success) {
                        throw new Error(result.message || 'Failed to hard delete notes');
                    }

                    enqueueSnackbar(`Successfully permanently deleted ${persistedNoteIds.length} note(s)`, {
                        variant: 'success'
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
                } else {
                    // SOFT DELETE: Use batch upsert API with deletedAt timestamp
                    const deletedAt = new Date().toISOString();

                    // Build batch soft delete requests
                    const batchRequests = persistedNoteIds.map(id => {
                        const note = notes.find(n => n.id === id);
                        if (!note) {
                            throw new Error(`Note ${id} not found`);
                        }

                        return {
                            id: note.id,
                            name: note.name,
                            description: note.description,
                            tags: note.hashtags?.map(h => h.id),
                            type: note.type,
                            deletedAt: deletedAt, // Set soft delete timestamp
                        };
                    });

                    // Call batch upsert API (single call instead of loop)
                    const result = await _upsertNotesBatch(token, batchRequests);

                    if (!result.success) {
                        throw new Error(result.message || 'Failed to soft delete notes');
                    }

                    enqueueSnackbar(`Successfully soft deleted ${persistedNoteIds.length} note(s)`, {
                        variant: 'success'
                    });

                    // Mark opened tabs as soft deleted
                    const updatedTabs = openTabs.map((tab: BaseTab) => {
                        if (tab.type === constants.vscode.tab.tabTypes.note && persistedNoteIds.includes(tab.data.id)) {
                            const noteData = tab.data as Note;
                            return { ...tab, data: { ...noteData, deletedAt: new Date() } };
                        }
                        return tab;
                    });
                    setOpenTabs(updatedTabs);
                }

                // Reload notes from API
                await loadNotes();
            }

            // Clear selection
            setRowSelection({});
        } catch (error) {
            console.error('Failed to delete notes:', error);
            const errorMessage = await parseApiError(error);

            // Show specific message for unauthorized
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to delete notes: ${errorMessage}`, { variant: 'error' });
            }
        }
    };

    /**
     * Restore deleted notes (soft delete restore - set deletedAt to null)
     * Uses batch API for better performance
     */
    const restoreSelectedNotes = async (ids?: number[]) => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(rowSelection).map(id => parseInt(id));
        if (selectedIds.length === 0) return;

        // Only restore persisted notes (positive IDs)
        const persistedNoteIds = selectedIds.filter(id => id > 0);

        try {
            const token = auth.userToken;

            if (persistedNoteIds.length > 0) {
                // Build batch restore requests
                const batchRequests = persistedNoteIds.map(id => {
                    const note = notes.find(n => n.id === id);
                    if (!note) {
                        throw new Error(`Note ${id} not found`);
                    }

                    return {
                        id: note.id,
                        name: note.name,
                        description: note.description,
                        tags: note.hashtags?.map(h => h.id),
                        type: note.type,
                        deletedAt: null, // Clear soft delete timestamp
                    };
                });

                // Call batch upsert API
                const result = await _upsertNotesBatch(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || 'Failed to restore notes');
                }

                enqueueSnackbar(`Successfully restored ${persistedNoteIds.length} note(s)`, {
                    variant: 'success'
                });

                // Update opened tabs to remove deletedAt
                const updatedTabs = openTabs.map((tab: BaseTab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.note && persistedNoteIds.includes(tab.data.id)) {
                        const noteData = tab.data as Note;
                        return { ...tab, data: { ...noteData, deletedAt: null } };
                    }
                    return tab;
                });
                setOpenTabs(updatedTabs);

                // Reload notes from API
                await loadNotes();
            }

            // Clear selection
            setRowSelection({});
        } catch (error) {
            console.error('Failed to restore notes:', error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to restore notes: ${errorMessage}`, { variant: 'error' });
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
                setRowSelection({ ...rowSelection, [row.id]: true });
                // Include this row in selectedIds along with existing selection
                selectedIds = [...Object.keys(rowSelection).map(id => parseInt(id)), parseInt(row.id)];
            } else {
                // Row already selected, use current selection
                selectedIds = Object.keys(rowSelection).map(id => parseInt(id));
            }

            selectedNotes = [...notes]
                .sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .filter(note =>
                    selectedIds.includes(note.id)
                );
        } else {
            // Clicked on empty area
            selectedIds = [];
        }

        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType('note-grid');
        setContextData({
            selectedNotes,
            selectedIds,
            onDelete: (isHardDelete: boolean) => deleteSelectedNotes(selectedIds, isHardDelete),  // Pass selectedIds and isHardDelete
            onRestore: () => restoreSelectedNotes(selectedIds),  // Add restore handler
            onAddNote: createNewNote,
        });
        setIsContextMenuOpen(true);
    };

    return {
        openNoteContextMenu,
        loadNotes,
    };
};
