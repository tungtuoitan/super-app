import React, { useMemo } from 'react';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Loader2 } from 'lucide-react';

// Import hooks and services from notes feature
import { useNotes, useNoteUI, type Note } from '../../features/notes';

/**
 * NoteGridPanel - A flexible layout panel for displaying notes in a data grid
 * VSCode-style dark theme grid for notes
 *
 * @param onNoteClick - Callback when a note is clicked
 * @param sidebarMode - If true, shows only name column for compact sidebar view
 */
export function NoteGridPanel({
    onNoteClick,
    sidebarMode = false
}: {
    onNoteClick?: (note: Note) => void;
    sidebarMode?: boolean;
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
    const columns: GridColDef[] = useMemo(() => {
        // Sidebar mode: only show name column
        if (sidebarMode) {
            return [
                {
                    field: 'name',
                    headerName: 'Name',
                    flex: 1,
                    minWidth: 200,
                    renderCell: (params) => (
                        <div className="flex items-center h-full">
                            <span className="text-sm text-primary font-medium cursor-pointer hover:underline">
                                {params.value || '—'}
                            </span>
                        </div>
                    ),
                },
            ];
        }

        // Full mode: show all columns
        return [
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
                        <span className="text-sm text-primary font-medium cursor-pointer hover:underline">
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
                    <span className={`text-xs font-medium ${params.value ? 'text-muted-foreground' : 'text-primary'}`}>
                        {params.value ? 'Archived' : 'Active'}
                    </span>
                </div>
            )
        }];
    }, [sidebarMode]);

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
            <div className="h-full flex items-center justify-center bg-editor-bg">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm text-editor-fg">Loading notes...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-full p-4 bg-editor-bg">
                <div className="p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                    Failed to load notes: {error.message}
                </div>
            </div>
        );
    }

    // Empty state
    if (!sortedNotes || sortedNotes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-editor-bg">
                <div className="text-center">
                    <h2 className="text-lg text-muted-foreground mb-2">No notes found</h2>
                    <p className="text-sm text-muted-foreground">Create your first note to get started</p>
                </div>
            </div>
        );
    }

    // Main content - VSCode-style dark DataGrid
    return (
        <div className="h-full w-full flex flex-col bg-editor-bg">
            {/* Header with count - hide in sidebar mode */}
            {!sidebarMode && (
                <div className="p-3 border-b border-editor-border bg-editor-sidebar">
                    <span className="text-sm text-editor-fg">
                        {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
            
            {/* DataGrid */}
            <div className="flex-1 w-full">
                <DataGrid
                    rows={sortedNotes}
                    columns={columns}
                    getRowId={(row) => row.noteId}
                    onRowClick={handleRowClick}
                    disableRowSelectionOnClick
                    rowHeight={sidebarMode ? 36 : 42}
                    columnHeaderHeight={sidebarMode ? 32 : 40}
                    hideFooter={sidebarMode}
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
                        color: 'hsl(var(--editor-foreground))',
                        '& .MuiDataGrid-main': {
                            backgroundColor: 'hsl(var(--editor-background))',
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: 'hsl(var(--editor-sidebar))',
                            borderBottom: '1px solid hsl(var(--editor-border))',
                            color: 'hsl(var(--editor-foreground))',
                            fontSize: sidebarMode ? '0.7rem' : '0.8rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            minHeight: sidebarMode ? '32px !important' : '40px !important',
                            maxHeight: sidebarMode ? '32px !important' : '40px !important',
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
                            color: 'hsl(var(--muted-foreground))',
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: '1px solid hsl(var(--editor-border))',
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
                                backgroundColor: 'hsl(var(--editor-hover))',
                            },
                            '&.Mui-selected': {
                                backgroundColor: 'hsl(var(--primary)) / 0.1',
                                '&:hover': {
                                    backgroundColor: 'hsl(var(--primary)) / 0.15',
                                }
                            }
                        },
                        '& .MuiDataGrid-footerContainer': {
                            backgroundColor: 'hsl(var(--editor-sidebar))',
                            borderTop: '1px solid hsl(var(--editor-border))',
                            color: 'hsl(var(--editor-foreground))',
                            display: sidebarMode ? 'none' : 'flex', // Hide footer in sidebar mode
                        },
                        '& .MuiTablePagination-root': {
                            color: 'hsl(var(--editor-foreground))',
                        },
                        '& .MuiTablePagination-selectIcon': {
                            color: 'hsl(var(--editor-foreground))',
                        },
                        '& .MuiDataGrid-iconButtonContainer': {
                            '& .MuiIconButton-root': {
                                color: 'hsl(var(--editor-foreground))',
                            }
                        },
                        '& .MuiDataGrid-sortIcon': {
                            color: 'hsl(var(--editor-foreground))',
                        },
                        '& .MuiDataGrid-menuIconButton': {
                            color: 'hsl(var(--editor-foreground))',
                        }
                    }}
                />
            </div>
        </div>
    );
}