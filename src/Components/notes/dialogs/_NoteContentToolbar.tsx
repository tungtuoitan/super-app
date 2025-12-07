/**
 * Note Content Toolbar Component
 * Toolbar for note dialog actions
 * Replicates RFD toolbar structure but follows SuperApp architecture guidelines
 */

import React, { useState } from 'react';
import { Check, X, Trash2, Link } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from '@/Components/ui/tooltip';
import { useAuthStore } from '@/store/auth/AuthStore';
import {useSnackbar} from 'notistack';
import {useNoteUIHelper} from '../../../hooks/useNoteUIHelper';
// NOTE: This component uses legacy create/update pattern. Consider refactoring to use _upsertNote
import { _createNote, _deleteNote, _updateNote, _upsertNote } from '../../../services/note.service';
import {useConfirmationPopover} from '@/shared/hooks';
import {CreateNoteDTO, UpdateNoteDTO, UpsertNoteDTO} from '../../../types/note.types';
import {ConfirmationPopover} from '@/shared/components';
import {useNoteUIStore} from '@/store/note/useNoteUIStore';

/**
 * Note Content Toolbar
 * Contains action buttons for note operations
 * Matches RFD toolbar structure and styling
 */
export function NoteContentToolbar() {
    const { selectedNote, hasUnsavedChanges } = useNoteUIStore();
    const { closeDialog, markAsSaved, resetChanges, updateSelectedNote } = useNoteUIHelper();
    const { isAuthenticated } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    
    // Debug log
    console.log('🎨 NoteContentToolbar render:', {
        hasUnsavedChanges,
        noteId: selectedNote?.id,
        noteName: selectedNote?.name
    });
    
    // TODO: Refactor to use direct service calls with token
    // const createNote = useCreateNote();
    // const updateNote = useUpdateNote();
    // const deleteNote = useDeleteNote();
    const createNote: any = { isPending: false }; // Temporarily disabled
    const updateNote: any = { isPending: false }; // Temporarily disabled
    const deleteNote: any = { isPending: false }; // Temporarily disabled
    const inProgressSaving = false; // Temporarily disabled

    // Confirmation popover hook
    const deleteConfirmation = useConfirmationPopover({
        confirmText: 'Ok',
        cancelText: 'Cancel',
        confirmColor: 'default',
        buttonVariant: 'ghost'
    });

    const handleSave = async () => {
        if (!selectedNote) return;
        
        const isNewNote = selectedNote.id === 0 || selectedNote.id < 0;
        
        try { 
            console.log('Saving note:', { selectedNote, isNewNote });
            
            if (isNewNote) {
                // Create new note using POST /api/notes
                const createData: CreateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    type: selectedNote.type,
                    tags: selectedNote.tags?.map((tag:any) => tag.tagId || tag.id).filter((id:any): id is number => id !== undefined) || [],
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
                    tags: selectedNote.tags?.map((tag:any) => tag.tagId || tag.id).filter((id:any): id is number => id !== undefined) || [],
                    isArchived: selectedNote.isArchived,
                };
                
                console.log('Updating note with data:', { id: selectedNote.id, data: updateData });
                const updatedNote = await updateNote.mutateAsync({
                    id: selectedNote.id,
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
        if (!selectedNote || selectedNote.id <= 0) {
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
                    await deleteNote.mutateAsync(selectedNote.id);
                    
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
        if (!selectedNote || selectedNote.id <= 0) return;

        const baseUrl = window.location.href;
        const noteLink = `${baseUrl}/note/${selectedNote.id}`;
        
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

    const isNewNote = selectedNote?.id === 0 || (selectedNote?.id && selectedNote.id < 0);

    // Render save/cancel/delete buttons matching RFD structure
    const renderSaveCancel = () => {
        return (
            <div className="inline-flex">
                <div id={`saving-cancel-note`}>
                    {/* Show Save/Cancel when there are changes or new content */}
                    {(hasUnsavedChanges || isNewNote) &&
                        <>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleSave}
                                            disabled={inProgressSaving}
                                            className="h-12 w-12 text-muted-foreground hover:text-foreground"
                                        >
                                            <Check className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Save</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCancel}
                                            disabled={inProgressSaving}
                                            className="h-12 w-12 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Cancel</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </>
                    }
                    {/* Show Delete for existing notes with proper conditions */}
                    {(() => {
                        const shouldShowDelete = !hasUnsavedChanges && !isNewNote && selectedNote && selectedNote.id > 0;
                        
                        return shouldShowDelete && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleDelete}
                                            disabled={inProgressSaving}
                                            className="h-12 w-12 text-muted-foreground hover:text-foreground"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Delete Note</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })()}
                </div>
            </div>
        )
    };

    return (
        <>
            <div 
                className="static z-auto bg-white shadow-sm border-b"
            >
                <div className="flex items-center justify-between bg-white text-muted-foreground px-6 pr-5 h-[61px] min-h-[61px]">
                    <div className="flex flex-wrap flex-col mt-1.5">
                        <h2 className="text-xl font-normal text-black flex items-center tracking-wide">
                            {`NOTE ID: ${selectedNote?.id || '0'}`}
                            {selectedNote && selectedNote.id > 0 && (
                                <div className="flex">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="px-4 py-0"
                                        onClick={copyNoteLink}
                                    >
                                        <Link className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </h2>
                    </div>
                    <div className="flex-grow" />
                    {isAuthenticated && !inProgressSaving && renderSaveCancel()}
                </div>
            </div>
            
            {/* Confirmation Popover for Delete */}
            <ConfirmationPopover {...deleteConfirmation.getPopoverProps()} />
        </>
    );
}