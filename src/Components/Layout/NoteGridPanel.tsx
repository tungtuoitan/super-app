import React from 'react';
import {
    Paper,
    Box,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';

// Import hooks and services from notes feature
import { useNotes, useNoteUI, type Note } from '../../features/notes';

/**
 * NoteGridPanel - A flexible layout panel for displaying notes in a data grid
 */
export function NoteGridPanel() {
    // Get data from React Query
    const { data: notes, isLoading, error } = useNotes();
    
    // Get UI state for interactions
    const { openDialog } = useNoteUI();

    // Define columns for the data grid
    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 200,
        },
        {
            field: 'description',
            headerName: 'Description', 
            flex: 2,
            minWidth: 300,
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {params.value || '—'}
                </Typography>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 120,
            renderCell: (params) => {
                const date = new Date(params.value);
                return (
                    <Typography variant="body2">
                        {date.toLocaleDateString()}
                    </Typography>
                );
            },
        },
        {
            field: 'updatedAt',
            headerName: 'Modified',
            width: 120,
            renderCell: (params) => {
                const date = new Date(params.value);
                return (
                    <Typography variant="body2">
                        {date.toLocaleDateString()}
                    </Typography>
                );
            },
        },
    ];

    // Handle row click
    const handleRowClick = (params: GridRowParams<Note>) => {
        openDialog(params.row);
    };

    // Loading state
    if (isLoading) {
        return (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">
                        Loading notes...
                    </Typography>
                </Box>
            </Paper>
        );
    }

    // Error state
    if (error) {
        return (
            <Paper sx={{ height: '100%', p: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load notes: {error.message}
                </Alert>
            </Paper>
        );
    }

    // Empty state
    if (!notes || notes.length === 0) {
        return (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box textAlign="center">
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No notes found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Create your first note to get started
                    </Typography>
                </Box>
            </Paper>
        );
    }

    // Main content
    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Notesx</Typography>
                <Typography variant="body2" color="text.secondary">
                    {notes.length} note{notes.length !== 1 ? 's' : ''}
                </Typography>
            </Box>
            
            <Box sx={{ flex: 1, p: 1 }}>
                <DataGrid
                    rows={notes}
                    columns={columns}
                    getRowId={(row) => row.noteId}
                    onRowClick={handleRowClick}
                    disableRowSelectionOnClick
                    sx={{
                        border: 0,
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none',
                        },
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    }}
                />
            </Box>
        </Paper>
    );
}