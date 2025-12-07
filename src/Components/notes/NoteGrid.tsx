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
import { Loader2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
 * NoteGrid - A flexible layout panel for displaying notes in a data table
 * VSCode-style dark theme table for notes
 *
 * @param onNoteClick - Callback when a note is clicked
 * @param sidebarMode - If true, shows only name column for compact sidebar view
 */
export function NoteGrid() {
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

        // Full mode: show all columns
        return [
            {
                id: 'select',
                header: ({ table }) => (
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={table.getIsAllPageRowsSelected()}
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                            aria-label="Select all"
                        />
                    </div>
                ),
                cell: ({ row }) => (
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label="Select row"
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                        />
                    </div>
                ),
                size: 30,
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'id',
                header: () => (
                    <div className="text-center">ID</div>
                ),
                size: 30,
                cell: ({ getValue }) => (
                    <div className="text-center text-sm">
                        {getValue() as number}
                    </div>
                ),
            },
            {
                accessorKey: 'name',
                header: () => (
                    <div className="text-left">Note Name</div>
                ),
                size: 300,
                cell: ({ getValue, row }) => (
                    <div className="text-sm text-primary text-left cursor-pointer hover:text-primary/80">
                        {(getValue() as string) || '—'}
                    </div>
                ),
            },
            // {
            //     accessorKey: 'type',
            //     header: 'Type',
            //     size: 120,
            //     cell: ({ getValue }) => {
            //         const type = getValue() as string;
            //         return type ? (
            //             <Badge variant={getTypeVariant(type)} className="capitalize">
            //                 {type}
            //             </Badge>
            //         ) : (
            //             <span className="text-sm text-muted-foreground">N/A</span>
            //         );
            //     },
            // },
            // {
            //     accessorKey: 'description',
            //     header: 'Description',
            //     size: 400,
            //     cell: ({ getValue }) => (
            //         <div className="text-sm text-muted-foreground line-clamp-2 overflow-hidden text-ellipsis">
            //             {(getValue() as string) || '—'}
            //         </div>
            //     ),
            // },
            // {
            //     accessorKey: 'tags',
            //     header: 'Tags',
            //     size: 200,
            //     cell: ({ getValue, row }) => {
            //         const tags = getValue();
            //         if (!tags || (Array.isArray(tags) && tags.length === 0)) {
            //             return <span className="text-sm text-muted-foreground">—</span>;
            //         }

            //         const tagArray = Array.isArray(tags) ? tags : (tags as string).split(',');
            //         const displayTags = tagArray.slice(0, 2);
            //         const remainingCount = tagArray.length - 2;

            //         return (
            //             <div className="flex items-center gap-1 flex-wrap">
            //                 {displayTags.map((tag: any, index: number) => (
            //                     <Badge
            //                         key={`${row.original.noteId}-${index}`}
            //                         variant="secondary"
            //                         className="text-[0.7rem] h-5"
            //                     >
            //                         #{typeof tag === 'string' ? tag.trim() : tag.name || tag}
            //                     </Badge>
            //                 ))}
            //                 {remainingCount > 0 && (
            //                     <Badge variant="outline" className="text-[0.7rem] h-5">
            //                         +{remainingCount}
            //                     </Badge>
            //                 )}
            //             </div>
            //         );
            //     }
            // },
            // {
            //     accessorKey: 'createdBy',
            //     header: 'Created By',
            //     size: 140,
            //     cell: ({ getValue }) => (
            //         <span className="text-sm text-muted-foreground">
            //             {(getValue() as string) || '—'}
            //         </span>
            //     ),
            // },
            // {
            //     accessorKey: 'createdAt',
            //     header: 'Created Date',
            //     size: 140,
            //     cell: ({ getValue }) => (
            //         <span className="text-sm text-muted-foreground">
            //             {getValue() ? formatDateTime(new Date(getValue() as string)) : '—'}
            //         </span>
            //     ),
            // },
            // {
            //     accessorKey: 'isArchived',
            //     header: 'Status',
            //     size: 100,
            //     cell: ({ getValue }) => {
            //         const isArchived = getValue() as boolean;
            //         return (
            //             <Badge variant={isArchived ? 'outline' : 'default'}>
            //                 {isArchived ? 'Archived' : 'Active'}
            //             </Badge>
            //         );
            //     }
            // }
        ];
    }, []);
console.log('NoteGrid rendered with notes::::::::::', notes);
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
        getRowId: (row) => String(row.id),
        enableRowSelection: true,
    });

    return (
        <div className="w-full h-full bg-background flex flex-col relative">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load notes</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Table */}
            <div 
                className="flex-1 overflow-auto rounded-md border"
                onContextMenu={(e) => {
                    // Only show context menu if clicking on empty area (not on a row)
                    const target = e.target as HTMLElement;
                    const isClickedOnRow = target.closest('tr[data-row]');
                    if (!isClickedOnRow) {
                        handleContextMenu(e);
                    }
                }}
            >
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b">
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="h-[36px] px-1 text-left align-middle font-semibold text-muted-foreground"
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
                                data-row
                                className={`border-b h-[36px] cursor-pointer hover:bg-muted/50 transition-colors ${
                                    row.original.isArchived ? 'opacity-60' : ''
                                }`}
                                onClick={() => openNoteTab(row.original)}
                                onContextMenu={(e) => handleContextMenu(e, row)}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="text-left">
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

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-1 bg-background">
                <div className="flex-1 text-sm text-left text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                    {table.getPageCount()} ({notes.length} total)
                </div>
                
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8"
                        title="First page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8"
                        title="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1 px-2">
                        <span className="text-sm font-medium">
                            {table.getState().pagination.pageIndex + 1}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            / {table.getPageCount()}
                        </span>
                    </div>
                    
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8"
                        title="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8"
                        title="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}