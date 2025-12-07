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
import { Alert, AlertDescription } from '@/Components/ui/alert';
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

    // Helper to get badge variant by type
    const getTypeVariant = (type?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            'meeting': 'default',
            'brainstorm': 'secondary',
            'research': 'outline',
            'bug': 'destructive',
            'task': 'default',
            'idea': 'secondary',
            'default': 'outline'
        };
        return variants[type?.toLowerCase() || 'default'] || variants.default;
    };

    
    // Define columns for the data table
    const columns = useMemo<ColumnDef<Note>[]>(() => {
        console.log('🔍 NoteGridPanel - sidebarMode:', sidebarMode, 'columns count:', sidebarMode ? 1 : 10);
        
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
                header: 'Note Name',
                size: 300,
                cell: ({ getValue, row }) => (
                    <div className="text-sm text-primary font-medium cursor-pointer hover:text-primary/80 underline">
                        {(getValue() as string) || '—'}
                    </div>
                ),
            },
            {
                accessorKey: 'type',
                header: 'Type',
                size: 120,
                cell: ({ getValue }) => {
                    const type = getValue() as string;
                    return type ? (
                        <Badge variant={getTypeVariant(type)} className="capitalize">
                            {type}
                        </Badge>
                    ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                    );
                },
            },
            {
                accessorKey: 'description',
                header: 'Description',
                size: 400,
                cell: ({ getValue }) => (
                    <div className="text-sm text-muted-foreground line-clamp-2 overflow-hidden text-ellipsis">
                        {(getValue() as string) || '—'}
                    </div>
                ),
            },
            {
                accessorKey: 'tags',
                header: 'Tags',
                size: 200,
                cell: ({ getValue, row }) => {
                    const tags = getValue();
                    if (!tags || (Array.isArray(tags) && tags.length === 0)) {
                        return <span className="text-sm text-muted-foreground">—</span>;
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
                                    className="text-[0.7rem] h-5"
                                >
                                    #{typeof tag === 'string' ? tag.trim() : tag.name || tag}
                                </Badge>
                            ))}
                            {remainingCount > 0 && (
                                <Badge variant="outline" className="text-[0.7rem] h-5">
                                    +{remainingCount}
                                </Badge>
                            )}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'createdBy',
                header: 'Created By',
                size: 140,
                cell: ({ getValue }) => (
                    <span className="text-sm text-muted-foreground">
                        {(getValue() as string) || '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'createdAt',
                header: 'Created Date',
                size: 140,
                cell: ({ getValue }) => (
                    <span className="text-sm text-muted-foreground">
                        {getValue() ? formatDateTime(new Date(getValue() as string)) : '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'isArchived',
                header: 'Status',
                size: 100,
                cell: ({ getValue }) => {
                    const isArchived = getValue() as boolean;
                    return (
                        <Badge variant={isArchived ? 'outline' : 'default'}>
                            {isArchived ? 'Archived' : 'Active'}
                        </Badge>
                    );
                }
            }
        ];
    }, [sidebarMode, formatDateTime, getTypeVariant]);

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
            <div className="w-full h-full bg-background">
                <div className="rounded-md border">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Failed to load notes: {error.message}</AlertDescription>
            </Alert>
        );
    }

    // Empty state
    if (!notes || notes.length === 0) {
        return (
            <div className="w-full h-full bg-background">
                <div className="rounded-md border">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center">
                                    <div className="text-muted-foreground">
                                        <h2 className="text-lg mb-2">No notes found</h2>
                                        <p className="text-sm">Create your first note to get started</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Main content - Modern table with rounded border
    const selectedCount = Object.keys(rowSelection).length;

    return (
        <div className="w-full h-full bg-background">
            {/* Header with count and actions - hide in sidebar mode */}
            {!sidebarMode && selectedCount > 0 && (
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">
                            {selectedCount} selected
                        </span>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete {selectedCount} note{selectedCount !== 1 ? 's' : ''}
                    </Button>
                </div>
            )}
            
            {/* Table */}
            <div className="rounded-md border">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b">
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="h-[52px] px-4 text-left align-middle font-semibold text-muted-foreground"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className={`border-b h-[50px] cursor-pointer hover:bg-muted/50 transition-colors ${
                                    row.original.isArchived ? 'opacity-60' : ''
                                }`}
                                onClick={() => openNoteTab(row.original)}
                                onContextMenu={(e) => handleContextMenu(e, row)}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 align-middle">
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
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-muted-foreground">
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