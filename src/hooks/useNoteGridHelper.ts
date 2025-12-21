import {_deleteNote, _getNotes} from '@/services/note.service';
import {storageService} from '@/services/storage.service';
import {useNoteUIStore} from '@/store/note/useNoteUIStore';
import { Note } from '@/types/note.types';
import {transformNotesData} from '../utils';
import {useEffect} from 'react';
import {useContextMenuStore} from '../store';
import {useSnackbar} from 'notistack';
import {useEditorTabHelper} from './useEditorTabHelper';
import {useNoteGridPanelStore} from '@/store/note/useNoteGridPanelStore';
import {useEditorTabsStore} from '@/store/editor/EditorTabStore';

export const useNoteGridHelper = () => {
    const {
        selectedNote,
        setSelectedNote,
        isDialogOpen,
        setIsDialogOpen,
        hasUnsavedChanges,
        setHasUnsavedChanges,
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

        // Generate temporary negative ID
        const tempId = -Math.floor(Math.random() * 10000);  // Larger range to avoid collisions
        // Create temporary note
        const newNote: Note = {
            id: tempId,
            name: 'Untitled Note',
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

        try {
            const token = storageService.getString('token') || '';
            // Send comma-separated IDs to backend
            await _deleteNote(token, selectedIds.join(','));

            enqueueSnackbar(`Successfully deleted ${selectedIds.length} note(s)`, {
                variant: 'success'
            });

            // Mark opened tabs as deleted instead of closing them
            const updatedTabs = openTabs.map(tab => {
                if (tab.type === 'note' && selectedIds.includes(tab.noteId)) {
                    return { ...tab, isDeleted: true };
                }
                return tab;
            });
            setOpenTabs(updatedTabs);

            // Clear selection and reload notes
            setRowSelection({});
            await loadNotes();
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
        rowSelection,
        setRowSelection,
        loadNotes,
        handleDeleteSelected,
        createNewNote,
        formatDateTime,
        // Other helpers and state can be returned as needed

    };
};
