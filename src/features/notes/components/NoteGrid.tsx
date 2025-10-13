/**
 * Modern NoteGrid Component
 * Uses React Query hooks and follows new architecture patterns
 */

import React, { useMemo } from 'react';
import { DataGrid, GridColDef, GridRowParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { Box, Chip, Typography, Alert } from '@mui/material';
import { useNotes } from '../hooks/useNotes';
import { useNoteUI } from '../store/NoteUIContext';
import { Spinner } from '@/shared/components/ui/Spinner';
import type { Note } from '@/features/notes/types/note.types';
import { dataGridStyles } from '@/config/theme';

interface NoteGridProps {
    onNoteClick?: (note: Note) => void;
}

/**
 * NoteGrid component following new architecture
 * - Uses React Query for server state (useNotes)
 * - Receives onNoteClick prop to avoid unnecessary re-renders
 * - Clean separation of concerns
 * - Performance optimized (no context subscription, memoized)
 */
export const NoteGrid = React.memo(function NoteGrid({ onNoteClick }: NoteGridProps) {
    // ✅ React Query for server state only
    const { data: notes, isLoading, error } = useNotes();

    // ✅ Get row selection state from context
    const { selectedRowIds, setSelectedRowIds } = useNoteUI();

    // Handle row selection change
    const handleRowSelectionChange = (newSelection: GridRowSelectionModel) => {
        setSelectedRowIds(newSelection as number[]);
    };

    // Helper functions matching old component
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

    const getTypeColor = (type?: string): 'primary' | 'warning' | 'info' | 'error' | 'default' => {
        const colors: Record<string, 'primary' | 'warning' | 'info' | 'error' | 'default'> = {
            'Meeting': 'primary',
            'Brainstorm': 'warning',
            'Research': 'info',
            'Bug': 'error',
            'default': 'default'
        };
        return colors[type || 'default'] || colors.default;
    };

    // ✅ NEW: Memoized sorted data (derived state)
    const sortedNotes = useMemo(() => {
        if (!notes) return [];
        return [...notes].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [notes]);

    // Column definitions matching old component exactly
    const columns: GridColDef[] = useMemo(() => [
        { 
            field: 'noteId', 
            headerName: 'ID', 
            width: 40,
            type: 'number'
        },
        {
            field: 'name',
            headerName: 'Note Name',
            width: 300,
            renderCell: (params) => (
                <Box
                    sx={{
                        cursor: onNoteClick ? 'pointer' : 'default',
                        color: 'primary.main',
                        textDecoration: onNoteClick ? 'underline' : 'none',
                        fontWeight: 500
                    }}
                    onClick={() => onNoteClick?.(params.row)}
                >
                    {params.value || '-'}
                </Box>
            )
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 200,
            renderCell: (params) => {
                if (!params.value || (Array.isArray(params.value) && params.value.length === 0)) {
                    return <Box sx={{ padding: '4px' }}>-</Box>;
                }

                // Handle both array and string format for backward compatibility
                const tags = Array.isArray(params.value) 
                    ? params.value 
                    : params.value.split(',');
                
                const displayTags = tags.slice(0, 2);
                const remainingCount = tags.length - 2;

                return (
                    <Box sx={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        padding: '4px',
                        alignItems: 'center'
                    }}>
                        {displayTags.map((tag: string, index: number) => (
                            <Chip
                                key={`${params.row.noteId}-${index}`}
                                label={`#${tag.trim()}`}
                                size="small"
                                variant="outlined"
                                color="secondary"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                        ))}
                        {remainingCount > 0 && (
                            <Chip
                                label={`+${remainingCount}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                        )}
                    </Box>
                );
            }
        },
        // {
        //     field: 'type',
        //     headerName: 'Type',
        //     width: 120,
        //     renderCell: (params) => (
        //         <Chip 
        //             label={params.value || 'N/A'} 
        //             color={getTypeColor(params.value) as any}
        //             size="small"
        //             variant="outlined"
        //         />
        //     )
        // },
        {
            field: 'description',
            width: 500,
            headerName: 'Description',
            renderCell: (params) => (
                <Box sx={{
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {params.value || '-'}
                </Box>
            )
        },
        {
            field: 'createdBy',
            headerName: 'Created By',
            width: 160,
            renderCell: (params) => params.value || '-'
        },
        {
            field: 'createdAt',
            headerName: 'Created Date',
            width: 180,
            renderCell: (params) => params.value ? formatDateTime(new Date(params.value)) : '-'
        },
        {
            field: 'isArchived',
            headerName: 'Status',
            flex: 1,
            minWidth: 100, 
            renderCell: (params) => (
                <Typography
                    variant="body2" 
                    sx={{
                        fontWeight: 500
                    }}
                >
                    {params.value ? 'Inactive' : 'Active'}
                </Typography>
            )
        }
    ], [onNoteClick]);

    // Handle error state
    if (error) {
        return <Alert severity="error">{error instanceof Error ? error.message : 'Unknown error occurred'}</Alert>;
    }

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            backgroundColor: 'background.paper'
        }}>
            <DataGrid
                getRowId={(row) => row.noteId}
                rows={sortedNotes || []}
                columns={columns}
                rowHeight={50}
                loading={isLoading}
                disableRowSelectionOnClick
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 25,
                        },
                    },
                }}
                pageSizeOptions={[25, 50, 100]}
                getRowClassName={(params) =>
                    params.row.isArchived ? "row-archived" : ""
                }
                checkboxSelection
                rowSelectionModel={selectedRowIds}
                onRowSelectionModelChange={handleRowSelectionChange}
                rowBufferPx={250}
                columnBufferPx={150}
                disableVirtualization={false}
                sx={{
                    ...dataGridStyles.root,
                    '& .MuiDataGrid-columnHeaders': {
                        borderBottom: '1px solid #e0e0e0 !important',
                    },
                    '& .MuiDataGrid-columnHeader': {
                        height: '52px',
                        minHeight: '52px',
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'white',
                    },
                    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
                        outline: 'none',
                    },
                    '& .MuiDataGrid-row': {
                        height: '50px',
                        minHeight: '50px',
                        maxHeight: '50px',
                        borderBottom: '1px solid #e0e0e0',
                    },
                    '& .MuiDataGrid-cell': {
                        display: 'flex',
                        alignItems: 'center',
                        lineHeight: '22px',
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 600,
                    },
                }}
            />
        </Box>
    );
});