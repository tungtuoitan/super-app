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
        const { enqueueSnackbar } = useSnackbar();
        const { setIsOpen, setAnchorPoint, setContextType, setContextData } = useContextMenuStore();
    
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
    
    
    
        // Delete selected notes
        const handleDeleteSelected = async () => {
            const selectedIds = Object.keys(rowSelection).map(id => parseInt(id));
            if (selectedIds.length === 0) return;
    
            const confirmed = window.confirm(
                `Are you sure you want to delete ${selectedIds.length} note(s)?`
            );
            if (!confirmed) return;
    
            try {
                const token = storageService.getString('token') || '';
                // Send comma-separated IDs to backend
                await _deleteNote(token, selectedIds.join(','));
    
                enqueueSnackbar(`Successfully deleted ${selectedIds.length} note(s)`, {
                    variant: 'success'
                });
    
                // Clear selection and reload notes
                setRowSelection({});
                await loadNotes();
            } catch (error) {
                console.error('Failed to delete notes:', error);
                enqueueSnackbar('Failed to delete notes', { variant: 'error' });
            }
        };
    
        // Handle context menu
        const handleContextMenu = (event: React.MouseEvent, row: any) => {
            event.preventDefault();
            event.stopPropagation();
    
            let selectedIds: number[];
    
            // If row is not selected, select only this row
            if (!row.getIsSelected()) {
                setRowSelection({ [row.id]: true });
                selectedIds = [parseInt(row.id)];
            } else {
                // Use current selection
                selectedIds = Object.keys(rowSelection).map(id => parseInt(id));
            }
    
            const selectedNotes = [...notes]
                .sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .filter(note => 
                    selectedIds.includes(note.noteId)
                );
    
            setAnchorPoint({ x: event.clientX, y: event.clientY });
            setContextType('note-grid');
            setContextData({
                selectedNotes,
                selectedIds,
                onDelete: handleDeleteSelected,
            });
            setIsOpen(true);
        };
    
        // Helper function to format date/time
        const formatDateTime = (date: Date): string => {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(date);
        };

    

    return {
        handleContextMenu,
        rowSelection,
        setRowSelection,
        loadNotes,
        handleDeleteSelected,
        formatDateTime,
        // Other helpers and state can be returned as needed

    };
};
