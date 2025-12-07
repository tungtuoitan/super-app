import React, { useEffect, useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    RowSelectionState
} from '@tanstack/react-table';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Checkbox } from '@/Components/ui/checkbox';
import {Note} from '@/types/note.types';
import {_getNotes, _deleteNote} from '@/services/note.service';
import {useEditorTabHelper} from '@/hooks/useEditorTabHelper';
import {useNoteGridPanelStore} from '@/store/note/useNoteGridPanelStore';
import {useNoteGridHelper} from '@/hooks/useNoteGridHelper';

/**
 * NoteGridPanel - A flexible layout panel for displaying notes in a data table
 * VSCode-style dark theme table for notes
 *
 * @param onNoteClick - Callback when a note is clicked
 * @param sidebarMode - If true, shows only name column for compact sidebar view
 */
export function NoteGridPanel({
    sidebarMode = false
}: {
    sidebarMode?: boolean;
} = {}) {
    // State từ centralized store
    const {
        notes,
        setNotes,
        isLoading,
        setIsLoading,
        error,
        setError,
        sorting,
        setSorting,
        pagination,
        setPagination,
        rowSelection,
        setRowSelection

    } = useNoteGridPanelStore();

    const { openNoteTab } = useEditorTabHelper();
    const { loadNotes, handleDeleteSelected, handleContextMenu,formatDateTime } = useNoteGridHelper();


    useEffect(() => {
        loadNotes();
    }, []);

    
    // Define columns for the data table
    const columns = useMemo<ColumnDef<Note>[]>(() => {
        // Sidebar mode: only show name column
        if (sidebarMode) {
            return [
                {
                    accessorKey: 'name',
                    header: 'Name',
                    cell: ({ getValue }) => (
                        <span className="text-sm text-primary cursor-pointer text-left">
                            {(getValue() as string) || '—'}
                        </span>
                    ),
                },
            ];
        }

        // Full mode: show all columns
        return [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                        className="translate-y-[2px]"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        className="translate-y-[2px]"
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                    />
                ),
                size: 40,
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'noteId',
                header: 'ID',
                size: 60,
                cell: ({ getValue }) => (
                    <div className="text-center text-sm">
                        {getValue() as number}
                    </div>
                ),
            },
            {
                accessorKey: 'name',
                header: 'Name',
                size: 250,
                cell: ({ getValue }) => (
                    <span className="text-sm text-primary font-medium cursor-pointer text-left">
                        {(getValue() as string) || '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'tags',
                header: 'Tags',
                size: 200,
                cell: ({ getValue, row }) => {
                    const tags = getValue();
                    if (!tags || (Array.isArray(tags) && tags.length === 0)) {
                        return <span className="text-sm text-[#858585]">—</span>;
                    }

                    const tagArray = Array.isArray(tags) ? tags : (tags as string).split(',');
                    const displayTags = tagArray.slice(0, 2);
                    const remainingCount = tagArray.length - 2;

                    return (
                        <div className="flex items-center gap-1 flex-wrap">
                            {displayTags.map((tag: any, index: number) => (
                                <Badge
                                    key={`${row.original.noteId}-${index}`}
                                    variant="secondary"
                                    className="text-[0.7rem] h-5 bg-[#4FC3F7]/10 text-[#4FC3F7] border-[#4FC3F7]/30"
                                >
                                    #{typeof tag === 'string' ? tag.trim() : tag.name || tag}
                                </Badge>
                            ))}
                            {remainingCount > 0 && (
                                <Badge variant="outline" className="text-[0.7rem] h-5 text-[#858585]">
                                    +{remainingCount}
                                </Badge>
                            )}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'description',
                header: 'Description',
                size: 300,
                cell: ({ getValue }) => (
                    <span className="text-sm text-[#cccccc] overflow-hidden text-ellipsis whitespace-nowrap block">
                        {(getValue() as string) || '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'createdAt',
                header: 'Created',
                size: 180,
                cell: ({ getValue }) => (
                    <span className="text-xs text-[#858585]">
                        {getValue() ? formatDateTime(new Date(getValue() as string)) : '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'isArchived',
                header: 'Status',
                size: 100,
                cell: ({ getValue }) => (
                    <span className={`text-xs font-medium ${(getValue() as boolean) ? 'text-muted-foreground' : 'text-primary'}`}>
                        {(getValue() as boolean) ? 'Archived' : 'Active'}
                    </span>
                )
            }
        ];
    }, [sidebarMode]);

    // Create table instance
    const table = useReactTable({
        data: notes.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            pagination,
            rowSelection,
        },
        getRowId: (row) => String(row.noteId),
        enableRowSelection: true,
    });

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
    if (!notes || notes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-editor-bg">
                <div className="text-center">
                    <h2 className="text-lg text-muted-foreground mb-2">No notes found</h2>
                    <p className="text-sm text-muted-foreground">Create your first note to get started</p>
                </div>
            </div>
        );
    }

    // Main content - VSCode-style dark table
    const selectedCount = Object.keys(rowSelection).length;

    return (
        <div className="h-full w-full flex flex-col bg-editor-bg">
            {/* Header with count and actions - hide in sidebar mode */}
            {!sidebarMode && (
                <div className="p-3 border-b border-editor-border bg-editor-sidebar flex items-center justify-between">
                    <span className="text-sm text-editor-fg">
                        {selectedCount > 0 ? (
                            <span className="font-semibold text-primary">
                                {selectedCount} selected
                            </span>
                        ) : (
                            <>
                                {notes.length} note{notes.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </span>
                    {selectedCount > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete {selectedCount} note{selectedCount !== 1 ? 's' : ''}
                        </Button>
                    )}
                </div>
            )}
            
            {/* Table */}
            <div className="flex-1 w-full overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-editor-sidebar sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b border-editor-border">
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className={`px-4 text-left align-middle font-semibold text-muted-foreground uppercase ${
                                            sidebarMode ? 'text-[0.7rem] h-8' : 'text-[0.8rem] h-10'
                                        }`}
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}Q
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className={`border-b border-editor-border cursor-pointer hover:bg-editor-hover ${
                                    sidebarMode ? 'h-9' : 'h-[42px]'
                                }`}
                                onClick={() => openNoteTab(row.original)}
                                onContextMenu={(e) => handleContextMenu(e, row)}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 align-middle text-left">
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination - hide in sidebar mode */}
            {!sidebarMode && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-editor-border bg-editor-sidebar">
                    <div className="text-sm text-editor-fg">
                        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                        {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, notes.length)} of{' '}
                        {notes.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}