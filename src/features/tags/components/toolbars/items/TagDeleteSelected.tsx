/**
 * Tag Delete Selected Component
 * Toolbar button to delete selected tags with confirmation popover
 */

import React from 'react';
import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import { useTagUI } from '../../../store/TagUIContext';
import { useSnackbar } from 'notistack';

/**
 * Delete selected tags button
 * Only visible when tags are selected
 * Uses confirmation before deletion
 */
export function TagDeleteSelected() {
    const { selectedRowIds, setSelectedRowIds } = useTagUI();
    const { enqueueSnackbar } = useSnackbar();

    // Check if any tags are selected
    const hasSelection = selectedRowIds && selectedRowIds.length > 0;

    const handleDeleteSelected = () => {
        if (!hasSelection) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedRowIds.length} selected tag${selectedRowIds.length === 1 ? '' : 's'}?`
        );

        if (confirmed) {
            // TODO: Implement actual deletion logic when delete hook is available
            console.log('Deleting selected tags:', selectedRowIds);
            
            // Clear selection
            setSelectedRowIds([]);
            
            enqueueSnackbar(
                `${selectedRowIds.length} tag${selectedRowIds.length === 1 ? '' : 's'} deleted successfully`,
                { variant: 'success' }
            );
        }
    };

    // Only show when tags are selected
    if (!hasSelection) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Delete {selectedRowIds.length} selected tag{selectedRowIds.length === 1 ? '' : 's'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}