import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Chip
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';

// Import hooks and services from notes feature
import { useNotes, useNoteUI, type Note } from '../../features/notes';

/**
 * NoteGridPanel - A flexible layout panel for displaying notes in a data grid
 * VSCode-style dark theme grid for notes
 */
export function NoteGridPanel({ 
    onNoteClick 
}: { 
    onNoteClick?: (note: Note) => void 
} = {}) {
    // Get data from React Query
    const { data: notes, isLoading, error } = useNotes();
    
    // Get UI state for interactions (fallback)
    const { openDialog } = useNoteUI();

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

    // Memoized sorted notes
    const sortedNotes = useMemo(() => {
        if (!notes) return [];
        return [...notes].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [notes]);

    // Define columns for the data grid
    const columns: GridColDef[] = useMemo(() => [
        { 
            field: 'noteId', 
            headerName: 'ID', 
            width: 60,
            type: 'number',
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 250,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#4FC3F7',
                            fontWeight: 500,
                            cursor: 'pointer',
                            '&:hover': {
                                textDecoration: 'underline'
                            }
                        }}
                    >
                        {params.value || '—'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 200,
            renderCell: (params) => {
                if (!params.value || (Array.isArray(params.value) && params.value.length === 0)) {
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <Typography variant="body2" sx={{ color: '#858585' }}>—</Typography>
                        </Box>
                    );
                }

                const tags = Array.isArray(params.value) 
                    ? params.value 
                    : params.value.split(',');
                
                const displayTags = tags.slice(0, 2);
                const remainingCount = tags.length - 2;

                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', height: '100%' }}>
                        {displayTags.map((tag: any, index: number) => (
                            <Chip
                                key={`${params.row.noteId}-${index}`}
                                label={`#${typeof tag === 'string' ? tag.trim() : tag.name || tag}`}
                                size="small"
                                sx={{ 
                                    fontSize: '0.7rem', 
                                    height: '20px',
                                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                    color: '#4FC3F7',
                                    border: '1px solid rgba(79, 195, 247, 0.3)'
                                }}
                            />
                        ))}
                        {remainingCount > 0 && (
                            <Chip
                                label={`+${remainingCount}`}
                                size="small"
                                sx={{ 
                                    fontSize: '0.7rem', 
                                    height: '20px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#858585'
                                }}
                            />
                        )}
                    </Box>
                );
            }
        },
        {
            field: 'description',
            headerName: 'Description', 
            flex: 2,
            minWidth: 300,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography
                        variant="body2"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#cccccc'
                        }}
                    >
                        {params.value || '—'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 180,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#858585', fontSize: '0.8rem' }}>
                        {params.value ? formatDateTime(new Date(params.value)) : '—'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'isArchived',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography
                        variant="body2" 
                        sx={{
                            color: params.value ? '#858585' : '#4EC9B0',
                            fontWeight: 500,
                            fontSize: '0.8rem'
                        }}
                    >
                        {params.value ? 'Archived' : 'Active'}
                    </Typography>
                </Box>
            )
        }
    ], []);

    // Handle row click
    const handleRowClick = (params: GridRowParams<Note>) => {
        // Use custom handler if provided, otherwise open dialog
        if (onNoteClick) {
            onNoteClick(params.row);
        } else {
            openDialog(params.row);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgb(30, 30, 30)'
            }}>
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <CircularProgress sx={{ color: '#4FC3F7' }} />
                    <Typography variant="body2" sx={{ color: '#cccccc' }}>
                        Loading notes...
                    </Typography>
                </Box>
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ height: '100%', p: 2, backgroundColor: 'rgb(30, 30, 30)' }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load notes: {error.message}
                </Alert>
            </Box>
        );
    }

    // Empty state
    if (!sortedNotes || sortedNotes.length === 0) {
        return (
            <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgb(30, 30, 30)'
            }}>
                <Box textAlign="center">
                    <Typography variant="h6" sx={{ color: '#858585' }} gutterBottom>
                        No notes found
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#858585' }}>
                        Create your first note to get started
                    </Typography>
                </Box>
            </Box>
        );
    }

    // Main content - VSCode-style dark DataGrid
    return (
        <Box sx={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: 'rgb(30, 30, 30)'
        }}>
            {/* Header with count */}
            <Box sx={{ 
                p: 1.5, 
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgb(37, 37, 38)'
            }}>
                <Typography variant="body2" sx={{ color: '#cccccc', fontSize: '0.85rem' }}>
                    {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
                </Typography>
            </Box>
            
            {/* DataGrid */}
            <Box sx={{ flex: 1, width: '100%' }}>
                <DataGrid
                    rows={sortedNotes}
                    columns={columns}
                    getRowId={(row) => row.noteId}
                    onRowClick={handleRowClick}
                    disableRowSelectionOnClick
                    rowHeight={42}
                    columnHeaderHeight={40}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 50,
                            },
                        },
                    }}
                    pageSizeOptions={[25, 50, 100]}
                    sx={{
                        border: 0,
                        color: '#cccccc',
                        '& .MuiDataGrid-main': {
                            backgroundColor: 'rgb(30, 30, 30)',
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: 'rgb(37, 37, 38)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cccccc',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        },
                        '& .MuiDataGrid-columnHeader': {
                            outline: 'none !important',
                            '&:focus': {
                                outline: 'none',
                            },
                            '&:focus-within': {
                                outline: 'none',
                            }
                        },
                        '& .MuiDataGrid-columnHeaderTitle': {
                            fontWeight: 600,
                            color: '#cccccc',
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            outline: 'none !important',
                            '&:focus': {
                                outline: 'none',
                            },
                            '&:focus-within': {
                                outline: 'none',
                            }
                        },
                        '& .MuiDataGrid-row': {
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(79, 195, 247, 0.15)',
                                }
                            }
                        },
                        '& .MuiDataGrid-footerContainer': {
                            backgroundColor: 'rgb(37, 37, 38)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cccccc',
                        },
                        '& .MuiTablePagination-root': {
                            color: '#cccccc',
                        },
                        '& .MuiTablePagination-selectIcon': {
                            color: '#cccccc',
                        },
                        '& .MuiDataGrid-iconButtonContainer': {
                            '& .MuiIconButton-root': {
                                color: '#cccccc',
                            }
                        },
                        '& .MuiDataGrid-sortIcon': {
                            color: '#cccccc',
                        },
                        '& .MuiDataGrid-menuIconButton': {
                            color: '#cccccc',
                        }
                    }}
                />
            </Box>
        </Box>
    );
}