/**
 * Note Delete Selected Component
 * Toolbar button to delete selected notes with confirmation popover
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { useSnackbar } from 'notistack';
import { ConfirmationPopover } from '@/shared/components/feedback/ConfirmationPopover';
import { useConfirmationPopover } from '@/shared/hooks/useConfirmationPopover';
import {useDeleteNotes} from '../../useNotes';
import {useNoteUI} from '../../NoteUIContext';

/**
 * Delete selected notes button
 * Only visible when notes are selected
 * Uses confirmation popover before deletion
 */
export function NoteDeleteSelected() {
    const { selectedRowIds, setSelectedRowIds } = useNoteUI();
    const deleteNotes = useDeleteNotes();
    const { enqueueSnackbar } = useSnackbar();

    // Confirmation popover hook
    const deleteConfirmation = useConfirmationPopover({
        confirmText: 'Ok',
        cancelText: 'Cancel',
        confirmColor: 'default',
        buttonVariant: 'ghost'
    });

    const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (selectedRowIds.length === 0) {
            return;
        }

        // Stop event propagation
        event.stopPropagation();
        event.preventDefault();

        // Show confirmation popover
        deleteConfirmation.show({
            event,
            message: `Do you want to delete ${selectedRowIds.length} selected note${selectedRowIds.length > 1 ? 's' : ''}?`,
            onConfirm: async () => {
                try {
                    await deleteNotes.mutateAsync(selectedRowIds);

                    enqueueSnackbar(
                        `${selectedRowIds.length} note${selectedRowIds.length > 1 ? 's' : ''} deleted successfully`,
                        {
                            variant: 'success',
                            autoHideDuration: 3000
                        }
                    );

                    // Clear selection after successful deletion
                    setSelectedRowIds([]);
                } catch (error) {
                    console.error('Error deleting notes:', error);
                    enqueueSnackbar('Failed to delete notes', {
                        variant: 'error',
                        autoHideDuration: 5000
                    });
                }
            }
        });
    };

    // Only show when notes are selected
    if (selectedRowIds.length === 0) {
        return null;
    }

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteClick}
                            disabled={deleteNotes.isPending}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Delete {selectedRowIds.length} selected note{selectedRowIds.length > 1 ? 's' : ''}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Confirmation Popover */}
            <ConfirmationPopover {...deleteConfirmation.getPopoverProps()} />
        </>
    );
}
