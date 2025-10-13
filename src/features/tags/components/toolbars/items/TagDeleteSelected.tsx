/**
 * Tag Delete Selected Component
 * Toolbar button to delete selected tags with confirmation popover
 */

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
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
        <Tooltip title={`Delete ${selectedRowIds.length} selected tag${selectedRowIds.length === 1 ? '' : 's'}`}>
            <IconButton
                onClick={handleDeleteSelected}
                sx={{
                    color: 'rgba(0, 0, 0, 0.54)',
                }}
                size="medium"
            >
                <DeleteForeverOutlinedIcon />
            </IconButton>
        </Tooltip>
    );
}