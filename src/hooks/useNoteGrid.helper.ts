import {_deleteNote, _getNotes} from '@/services/note.service';
import {storageService} from '@/services/storage.service';
import {useNoteUIStore} from '@/store/note/useNoteUI.store';
import { Note } from '@/types/note.types';
import {collectIdsFromTabs, generateTempId, generateUnsavedName, transformNotesData} from '../utils';
import {useEffect} from 'react';
import {useContextMenuStore, useEditorTabsStore} from '../store';
import {useSnackbar} from 'notistack';
import {useEditorTabHelper} from './useEditorTab.helper';
import {useNoteGridPanelStore} from '@/store/note/useNoteGridPanel.store';
import { constants } from '@/utils/constants';
import {BaseTab} from '@/types/editor/tab.types';

export const useNoteGridHelper = () => {
    const {
        selectedNote,
        setSelectedNote,
        isDialogOpen,
        setIsDialogOpen,
        noteHasChanges,
        setNoteHasChanges,
        originalNoteRef,
    } = useNoteUIStore();

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
    } = useNoteGridPanelStore();
    
    const { openNoteTab } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setIsContextMenuOpen, setAnchorPoint, setContextType, setContextData } = useContextMenuStore();

    // Create new note (temporary with negative ID)
    const createNewNote = () => {
        console.log('➕ Creating new note...');

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
        };

        // Insert at the beginning of notes array
        setNotes([newNote, ...notes]);

        // Open note tab for editing
        openNoteTab(newNote);

        console.log('✅ New note created and opened:', newNote);
    };

    // Load notes
    const loadNotes = async () => {
        try {
            setIsLoading(true);
            const token = storageService.getString('token');
            const data = await _getNotes(token??'', { getAll: true });
            // Transform dates from API strings to Date objects
            const transformedData = transformNotesData(data);
            setNotes(transformedData);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };    
    
    // Delete selected notes (called from context menu after confirmation)
    const handleDeleteSelected = async (ids?: number[]) => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(rowSelection).map(id => parseInt(id));
        if (selectedIds.length === 0) return;

        // Separate temporary notes (negative IDs) from persisted notes (positive IDs)
        const tempNoteIds = selectedIds.filter(id => id < 0);
        const persistedNoteIds = selectedIds.filter(id => id > 0);

        try {
            // Handle temporary notes - just remove from grid locally
            if (tempNoteIds.length > 0) {
                console.log('🗑️ Removing temporary notes from grid:', tempNoteIds);
                setNotes(prevNotes => prevNotes.filter(note => !tempNoteIds.includes(note.id)));
                
                enqueueSnackbar(`Removed ${tempNoteIds.length} unsaved note(s)`, {
                    variant: 'success'
                });
            }

            // Handle persisted notes - call API
            if (persistedNoteIds.length > 0) {
                const token = storageService.getString('token') || '';
                // Send comma-separated IDs to backend
                await _deleteNote(token, persistedNoteIds.join(','));

                enqueueSnackbar(`Successfully deleted ${persistedNoteIds.length} note(s)`, {
                    variant: 'success'
                });

                // Mark opened tabs as deleted instead of closing them
                const updatedTabs = openTabs.map((tab: BaseTab) => {
                    if (tab.type === constants.tabTypes.note && persistedNoteIds.includes(tab.data.id)) {
                        return { ...tab, isDeleted: true };
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
            console.error('Failed to delete notes:', error);
            enqueueSnackbar('Failed to delete notes', { variant: 'error' });
        }
    };        // Handle context menu
        const openContextMenu = (event: React.MouseEvent, row?: any) => {
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
            onDelete: () => handleDeleteSelected(selectedIds),  // Pass selectedIds directly
            onAddNote: createNewNote,
        });
        setIsContextMenuOpen(true);
    };        // Helper function to format date/time (short format for grid)
        const formatDateTime = (date: Date): string => {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(date);
        };

    

    return {
        openContextMenu,
        loadNotes,
        handleDeleteSelected,
        createNewNote,
        formatDateTime,
        // Other helpers and state can be returned as needed

    };
};
