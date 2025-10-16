/**
 * Note Content Toolbar Component
 * Toolbar for note dialog actions
 * Replicates RFD toolbar structure but follows SuperApp architecture guidelines
 */

import React, { useState } from 'react';
import { 
    AppBar, 
    IconButton, 
    styled, 
    Toolbar, 
    Tooltip, 
    Typography,
    Box 
} from '@mui/material';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import LinkIcon from '@mui/icons-material/Link';
import { useNoteUI } from '../../store/NoteUIContext';
import { useAuthStore } from '../../../../contexts/AuthContext';
import { useCreateNote, useUpdateNote, useDeleteNote } from '../../hooks/useNotes';
import { useSnackbar } from 'notistack';
import { ConfirmationPopover } from '@/shared/components/feedback/ConfirmationPopover';
import { useConfirmationPopover } from '@/shared/hooks/useConfirmationPopover';
import type { CreateNoteDTO, UpdateNoteDTO } from '../../types/note.types';

// Grow spacer component
const Grow = styled('div')({
    flexGrow: 1,
});

// Styled wrapper for tooltips
export const TooltipContainer = styled('div')({
    display: 'inline-flex', 
    '& .hide': {
        display: 'none',
    }
});

// Main toolbar panel wrapper matching RFD structure
export const ToolbarPanelWrapper = styled(Toolbar)({
    backgroundColor: '#fff',
    color: 'rgba(0, 0, 0, 0.6)!important',
    paddingLeft: '24px!important',
    paddingRight: '20px!important',
    height: '61px',
    maxHeight: '61px !important',
    minHeight: '61px !important',

    '& .MuiBox-root ': {
        maxHeight: '61px !important',

        '& .MuiPaper-root': {
            height: '61px !important',

            ' & .MuiToolbar-root': {
                minHeight: '61px !important',
            }
        }
    },
    '& .MuiPaper-elevation4': {
        boxShadow: 'none',
    }
});

/**
 * Note Content Toolbar
 * Contains action buttons for note operations
 * Matches RFD toolbar structure and styling
 */
export function NoteContentToolbar() {
    const { selectedNote, closeDialog, hasUnsavedChanges, markAsSaved, resetChanges, updateSelectedNote } = useNoteUI();
    const { isAuthenticated } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    
    // React Query hooks
    const createNote = useCreateNote();
    const updateNote = useUpdateNote();
    const deleteNote = useDeleteNote();
    const inProgressSaving = createNote.isPending || updateNote.isPending || deleteNote.isPending;

    // Confirmation popover hook
    const deleteConfirmation = useConfirmationPopover({
        confirmText: 'Ok',
        cancelText: 'Cancel',
        confirmColor: 'primary',
        buttonVariant: 'text'
    });

    const handleSave = async () => {
        if (!selectedNote) return;
        
        const isNewNote = selectedNote.noteId === 0;
        
        try { 
            console.log('Saving note:', { selectedNote, isNewNote });
            
            if (isNewNote) {
                // Create new note using POST /api/notes
                const createData: CreateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    type: selectedNote.type,
                    tags: selectedNote.tags?.map(tag => tag.tagId || tag.id).filter((id): id is number => id !== undefined) || [],
                };
                
                console.log('Creating note with data:', createData);
                const createdNote = await createNote.mutateAsync(createData);
                
                enqueueSnackbar('Note created successfully', { 
                    variant: 'success', 
                    autoHideDuration: 3000 
                });
                
                // Update the dialog with the fresh server data (now with real ID)
                updateSelectedNote(createdNote);
            } else {
                // Update existing note using PUT /api/notes/{id}
                const updateData: UpdateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    type: selectedNote.type,
                    tags: selectedNote.tags?.map(tag => tag.tagId || tag.id).filter((id): id is number => id !== undefined) || [],
                    isArchived: selectedNote.isArchived,
                };
                
                console.log('Updating note with data:', { id: selectedNote.noteId, data: updateData });
                const updatedNote = await updateNote.mutateAsync({ 
                    id: selectedNote.noteId, 
                    data: updateData 
                });
                
                enqueueSnackbar('Note saved successfully', { 
                    variant: 'success', 
                    autoHideDuration: 3000 
                });
                
                // Update the dialog with the fresh server data
                if (updatedNote) {
                    updateSelectedNote(updatedNote);
                }
            }
            
            // Mark as saved to clear unsaved changes
            markAsSaved();
        } catch (error) {
            console.error('Error saving note:', error);
            const action = isNewNote ? 'create' : 'save';
            enqueueSnackbar(`Failed to ${action} note`, { 
                variant: 'error', 
                autoHideDuration: 5000 
            });
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
            if (!confirmed) return;
            
            // Restore to original state
            resetChanges();
        } else {
            // No changes, just close
            closeDialog();
        }
    };

    const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!selectedNote || selectedNote.noteId <= 0) {
            return;
        }
        
        // Stop event propagation to prevent any parent handlers
        event.stopPropagation();
        event.preventDefault();
        
        // Show confirmation popover
        deleteConfirmation.show({
            event,
            message: 'Do you want to delete this note?',
            onConfirm: async () => {
                try {
                    await deleteNote.mutateAsync(selectedNote.noteId);
                    
                    enqueueSnackbar('Note deleted successfully', { 
                        variant: 'success', 
                        autoHideDuration: 3000 
                    });
                    
                    closeDialog();
                } catch (error) {
                    console.error('Error deleting note:', error);
                    enqueueSnackbar('Failed to delete note', { 
                        variant: 'error', 
                        autoHideDuration: 5000 
                    });
                }
            }
        });
    };

    const copyNoteLink = () => {
        if (!selectedNote || selectedNote.noteId <= 0) return;
        
        const baseUrl = window.location.href;
        const noteLink = `${baseUrl}/note/${selectedNote.noteId}`;
        
        navigator.clipboard.writeText(noteLink).then(() => {
            // TODO: Add notification for copy success
            enqueueSnackbar('Note link copied to clipboard', { 
                variant: 'success', 
                autoHideDuration: 3000 
            });
        }).catch(err => {
            console.error('Failed to copy link:', err);
        });
    };

    const isNewNote = selectedNote?.noteId === 0;

    // Render save/cancel/delete buttons matching RFD structure
    const renderSaveCancel = () => {
        return (
            <TooltipContainer>
                <div style={{ display: 'inline-flex' }}>
                    <div id={`saving-cancel-note`}>
                        {/* Show Save/Cancel when there are changes or new content */}
                        {(hasUnsavedChanges || isNewNote) &&
                            <>
                                <Tooltip 
                                    title="Save"
                                    disableInteractive
                                    slotProps={{
                                        tooltip: {
                                            sx: {
                                                fontSize: '10px',
                                                borderRadius: '2px'
                                            }
                                        }
                                    }}
                                >
                                    <span>
                                        <IconButton
                                            onClick={handleSave}
                                            disabled={inProgressSaving}
                                            style={{ 
                                                color: 'rgba(0, 0, 0, 0.54)',
                                                width: '48px',
                                                height: '48px'
                                            }}
                                        >
                                            <CheckOutlinedIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip 
                                    title="Cancel"
                                    disableInteractive
                                    slotProps={{
                                        tooltip: {
                                            sx: {
                                                fontSize: '10px',
                                                borderRadius: '2px'
                                            }
                                        }
                                    }}
                                >
                                    <span>
                                        <IconButton
                                            onClick={handleCancel}
                                            disabled={inProgressSaving}
                                            style={{ 
                                                color: 'rgba(0, 0, 0, 0.54)',
                                                width: '48px',
                                                height: '48px'
                                            }}
                                        >
                                            <CloseOutlinedIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        }
                        {/* Show Delete for existing notes with proper conditions */}
                        {(() => {
                            const shouldShowDelete = !hasUnsavedChanges && !isNewNote && selectedNote && selectedNote.noteId > 0;
                            
                            return shouldShowDelete && (
                                <Tooltip 
                                    title="Delete Note"
                                    slotProps={{
                                        tooltip: {
                                            sx: {
                                                fontSize: '10px',
                                                borderRadius: '2px'
                                            }
                                        }
                                    }}
                                >
                                    <span>
                                        <IconButton
                                            onClick={handleDelete}
                                            disabled={inProgressSaving}
                                            style={{ 
                                                color: 'rgba(0, 0, 0, 0.54)',
                                                width: '48px',
                                                height: '48px'
                                            }}
                                        >
                                            <DeleteForeverOutlinedIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            );
                        })()}
                    </div>
                </div>
            </TooltipContainer>
        )
    };

    return (
        <>
            <AppBar
                style={{ zIndex: 'auto', backgroundColor: '#fff' }}
                position="static"
                elevation={2}
                variant="elevation"
            >
                <ToolbarPanelWrapper>
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        flexDirection: 'column', 
                        marginTop: 6 
                    }}>
                        <Typography 
                            variant="h6" 
                            className="MuiTypography-root MuiTypography-h6"
                            style={{ 
                                display: 'flex', 
                                color: '#000000',
                                fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
                                fontSize: '20px',
                                fontWeight: 400,
                                lineHeight: 1.6,
                                letterSpacing: '0.0075em'
                            }}
                        >
                            {`NOTE ID: ${selectedNote?.noteId || '0'}`}
                            {selectedNote && selectedNote.noteId > 0 && (
                                <div style={{ display: 'flex' }}>
                                    <IconButton 
                                        style={{ padding: '0 16px' }}
                                        onClick={copyNoteLink}
                                    >
                                        <LinkIcon />
                                    </IconButton>
                                </div>
                            )}
                        </Typography>
                    </div>
                    <Grow />
                    {isAuthenticated && !inProgressSaving && renderSaveCancel()}
                </ToolbarPanelWrapper>
            </AppBar>
            
            {/* Confirmation Popover for Delete */}
            <ConfirmationPopover {...deleteConfirmation.getPopoverProps()} />
        </>
    );
}