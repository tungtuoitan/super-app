import React, { useMemo } from 'react';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Loader2 } from 'lucide-react';

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
                <div className="flex items-center h-full">
                    <span className="text-sm text-[#4FC3F7] font-medium cursor-pointer hover:underline">
                        {params.value || '—'}
                    </span>
                </div>
            ),
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 200,
            renderCell: (params) => {
                if (!params.value || (Array.isArray(params.value) && params.value.length === 0)) {
                    return (
                        <div className="flex items-center h-full">
                            <span className="text-sm text-[#858585]">—</span>
                        </div>
                    );
                }

                const tags = Array.isArray(params.value) 
                    ? params.value 
                    : params.value.split(',');
                
                const displayTags = tags.slice(0, 2);
                const remainingCount = tags.length - 2;

                return (
                    <div className="flex items-center gap-1 flex-wrap h-full">
                        {displayTags.map((tag: any, index: number) => (
                            <span
                                key={`${params.row.noteId}-${index}`}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] h-5 bg-[#4FC3F7]/10 text-[#4FC3F7] border border-[#4FC3F7]/30"
                            >
                                #{typeof tag === 'string' ? tag.trim() : tag.name || tag}
                            </span>
                        ))}
                        {remainingCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] h-5 bg-white/5 text-[#858585]">
                                +{remainingCount}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            field: 'description',
            headerName: 'Description', 
            flex: 2,
            minWidth: 300,
            renderCell: (params) => (
                <div className="flex items-center h-full">
                    <span className="text-sm text-[#cccccc] overflow-hidden text-ellipsis whitespace-nowrap">
                        {params.value || '—'}
                    </span>
                </div>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 180,
            renderCell: (params) => (
                <div className="flex items-center h-full">
                    <span className="text-xs text-[#858585]">
                        {params.value ? formatDateTime(new Date(params.value)) : '—'}
                    </span>
                </div>
            ),
        },
        {
            field: 'isArchived',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <div className="flex items-center h-full">
                    <span className={`text-xs font-medium ${params.value ? 'text-[#858585]' : 'text-[#4EC9B0]'}`}>
                        {params.value ? 'Archived' : 'Active'}
                    </span>
                </div>
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
            <div className="h-full flex items-center justify-center bg-[rgb(30,30,30)]">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#4FC3F7] animate-spin" />
                    <span className="text-sm text-[#cccccc]">Loading notes...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-full p-4 bg-[rgb(30,30,30)]">
                <div className="p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                    Failed to load notes: {error.message}
                </div>
            </div>
        );
    }

    // Empty state
    if (!sortedNotes || sortedNotes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-[rgb(30,30,30)]">
                <div className="text-center">
                    <h2 className="text-lg text-[#858585] mb-2">No notes found</h2>
                    <p className="text-sm text-[#858585]">Create your first note to get started</p>
                </div>
            </div>
        );
    }

    // Main content - VSCode-style dark DataGrid
    return (
        <div className="h-full w-full flex flex-col bg-[rgb(30,30,30)]">
            {/* Header with count */}
            <div className="p-3 border-b border-white/10 bg-[rgb(37,37,38)]">
                <span className="text-sm text-[#cccccc]">
                    {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
                </span>
            </div>
            
            {/* DataGrid */}
            <div className="flex-1 w-full">
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
            </div>
        </div>
    );
}