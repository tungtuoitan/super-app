// NoteGrid.view.tsx (Dumb Component)
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Chip, Box, Alert } from '@mui/material';

// Internal types
import type { Note } from '../../../types';

// Internal config
import { dataGridStyles } from '../../../config/theme';

/**
 * Props interface for the NoteGrid view component.
 */
interface NoteGridViewProps {
    /** Array of notes to display in the grid */
    notes: Note[];
    /** Loading state for the grid */
    loading: boolean;
    /** Error message if any */
    error: string | null;
    /** Handler for when a note is clicked */
    onNoteClick: (note: Note) => void;
}

/**
 * NoteGrid view component (Dumb Component).
 * 
 * This component is purely presentational and handles:
 * - Rendering the data grid with notes
 * - Displaying loading and error states
 * - Column definitions and cell rendering
 * - Grid styling and configuration
 * - Calling event handlers passed from container
 * 
 * All business logic and state management is handled by the container component.
 * 
 * @param props - Component props
 * @returns Data grid view with note display functionality
 */
export function NoteGridView({ notes, loading, error, onNoteClick }: NoteGridViewProps) {
    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
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

    const columns: GridColDef[] = [
        { 
            field: 'noteId', 
            headerName: 'ID', 
            width: 40,
            type: 'number'
        },
        {
            field: 'name',
            headerName: 'Note Name',
            width: 400,
            renderCell: (params) => (
                <Box
                    sx={{
                        cursor: 'pointer',
                        color: 'primary.main',
                        textDecoration: 'underline',
                        fontWeight: 500
                    }}
                    onClick={() => onNoteClick(params.row)}
                >
                    {params.value}
                </Box>
            )
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip 
                    label={params.value || 'N/A'} 
                    color={getTypeColor(params.value) as any}
                    size="small"
                    variant="outlined"
                />
            )
        },
        {
            field: 'description',
            headerName: 'Description',
            width: 500,
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
            field: 'tags',
            headerName: 'Tags',
            width: 200,
            renderCell: (params) => {
                if (!params.value) return <Box sx={{ padding: '4px' }}>-</Box>;

                const tags = params.value.split(',');
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
        {
            field: 'createdBy',
            headerName: 'Created By',
            width: 160
        },
        {
            field: 'createdAt',
            headerName: 'Created Date',
            width: 140,
            renderCell: (params) => formatDate(new Date(params.value))
        },
        {
            field: 'isArchived',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <Chip 
                    label={params.value ? 'Archived' : 'Active'} 
                    color={params.value ? 'default' : 'success'}
                    size="small"
                    variant={params.value ? 'outlined' : 'filled'}
                />
            )
        }
    ];

    // Handle error state
    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            backgroundColor: 'background.paper'
        }}>
            <DataGrid
                getRowId={(row) => row.noteId}
                rows={notes}
                columns={columns}
                rowHeight={50}
                loading={loading}
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
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 600,
                    },
                }}
            />
        </Box>
    );
}