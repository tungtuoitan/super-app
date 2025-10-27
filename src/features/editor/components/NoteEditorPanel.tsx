/**
 * Note Editor Panel
 * Reuses NoteDetailDialogContent for editor area tabs
 * Includes toolbar for save/cancel actions
 */

import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { NoteDetailDialogContent } from '@/features/notes/components/dialogs/NoteDetailDialogContent';
import { useNoteUI } from '@/features/notes/store/NoteUIContext';
import { useUpdateNote, useCreateNote } from '@/features/notes/hooks/useNotes';
import { useEditorTabs } from '@/features/editor/store/EditorTabContext';
import { useSnackbar } from 'notistack';
import type { NoteTab } from '@/features/editor/types/tab.types';
import type { Note } from '@/features/notes/types/note.types';

interface NoteEditorPanelProps {
    tab: NoteTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { selectedNote, updateSelectedNote, markAsSaved, resetChanges, hasUnsavedChanges, setSelectedNote } = useNoteUI();
    const { markTabAsChanged, updateTabNote } = useEditorTabs();
    const updateNoteMutation = useUpdateNote();
    const createNoteMutation = useCreateNote();
    const { enqueueSnackbar } = useSnackbar();

    const isCreateMode = selectedNote?.noteId === 0;

    // Sync hasUnsavedChanges with tab state
    React.useEffect(() => {
        markTabAsChanged(tab.id, hasUnsavedChanges);
    }, [hasUnsavedChanges, tab.id, markTabAsChanged]);

    const handleSave = async () => {
        if (!selectedNote) return;

        try {
            let savedNote: Note;
            
            if (isCreateMode) {
                // Create new note - convert Note to CreateNoteDTO
                const createData: import('@/features/notes/types/note.types').CreateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    tags: selectedNote.tags?.map(tag => tag.tagId),
                    type: selectedNote.type,
                };
                
                console.log('📝 Creating note with data:', createData);
                savedNote = await createNoteMutation.mutateAsync(createData);
                console.log('✅ Note created successfully:', savedNote);
                
                enqueueSnackbar('Note created successfully', { variant: 'success' });
            } else {
                // Update existing note - convert Note to UpdateNoteDTO
                const updateData: import('@/features/notes/types/note.types').UpdateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    tags: selectedNote.tags?.map(tag => tag.tagId),
                    type: selectedNote.type,
                    isArchived: selectedNote.isArchived,
                };
                
                console.log('📝 Updating note with data:', updateData);
                savedNote = await updateNoteMutation.mutateAsync({
                    id: selectedNote.noteId,
                    data: updateData,
                });
                console.log('✅ Note updated successfully:', savedNote);
                
                enqueueSnackbar('Note saved successfully', { variant: 'success' });
            }
            
            // ✅ FIX: Update context with the saved note from server
            console.log('🔄 Setting selectedNote to saved note:', savedNote);
            setSelectedNote(savedNote);
            
            // ✅ FIX: Update tab with the saved note
            if (updateTabNote) {
                console.log('📑 Updating tab with saved note');
                updateTabNote(tab.id, savedNote);
            }
            
            // Mark as saved after all updates
            markAsSaved();
            
        } catch (error) {
            console.error('❌ Failed to save note:', error);
            enqueueSnackbar('Failed to save note', { variant: 'error' });
        }
    };

    const handleCancel = () => {
        resetChanges();
        enqueueSnackbar('Changes discarded', { variant: 'info' });
    };

    const isSaving = updateNoteMutation.isPending || createNoteMutation.isPending;

    // Keyboard shortcut: Ctrl+S to save
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && !isSaving) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, isSaving, selectedNote]);

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: '#f6f6f6',
            }}
        >
            {/* Toolbar */}
            <Box
                sx={{
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgb(37, 37, 38)',
                    gap: 2,
                }}
            >
                <Typography
                    variant="body2"
                    sx={{
                        color: '#cccccc',
                        fontSize: '13px',
                        fontWeight: 500,
                    }}
                >
                    {isCreateMode ? 'New Note' : 'Edit Note'}
                    {hasUnsavedChanges && (
                        <span style={{ color: '#4FC3F7', marginLeft: '8px' }}>●</span>
                    )}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Save (Ctrl+S)">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges || isSaving}
                                sx={{
                                    color: hasUnsavedChanges ? '#4FC3F7' : 'rgba(255, 255, 255, 0.4)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                    },
                                }}
                            >
                                <SaveIcon sx={{ fontSize: '18px' }} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Discard Changes">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleCancel}
                                disabled={!hasUnsavedChanges}
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                    },
                                }}
                            >
                                <RefreshIcon sx={{ fontSize: '18px' }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <NoteDetailDialogContent />
            </Box>
        </Box>
    );
}
