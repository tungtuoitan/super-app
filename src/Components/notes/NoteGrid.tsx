/**
 * Modern NoteGrid Component
 * Uses React Query hooks and follows new architecture patterns
 * Migrated from MUI DataGrid to TanStack Table with shadcn/ui
 */

import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    SortingState
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Checkbox } from '@/Components/ui/checkbox';
import {Note} from './note.types';
import {useNotes} from './useNotes';
import {useNoteUI} from './NoteUIContext';

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

    // Table state
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

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

    // ✅ NEW: Memoized sorted data (derived state)
    const sortedNotes = useMemo(() => {
        if (!notes) return [];
        return [...notes].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [notes]);

    // Row selection handlers
    const toggleRowSelection = (noteId: number) => {
        if (selectedRowIds.includes(noteId)) {
            setSelectedRowIds(selectedRowIds.filter((id: number) => id !== noteId));
        } else {
            setSelectedRowIds([...selectedRowIds, noteId]);
        }
    };

    const toggleAllRows = () => {
        if (selectedRowIds.length === sortedNotes.length) {
            setSelectedRowIds([]);
        } else {
            setSelectedRowIds(sortedNotes.map((note: Note) => note.noteId));
        }
    };

    // Column definitions with shadcn/ui components
    const columns = useMemo<ColumnDef<Note>[]>(() => [
        {
            id: 'select',
            size: 40,
            header: () => (
                <Checkbox
                    checked={sortedNotes.length > 0 && selectedRowIds.length === sortedNotes.length}
                    onCheckedChange={toggleAllRows}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedRowIds.includes(row.original.noteId)}
                    onCheckedChange={() => toggleRowSelection(row.original.noteId)}
                    aria-label="Select row"
                />
            ),
        },
        { 
            accessorKey: 'noteId',
            header: 'ID', 
            size: 40,
            cell: ({ getValue }) => (
                <div className="text-center">{getValue() as number}</div>
            ),
        },
        {
            accessorKey: 'name',
            header: 'Note Name',
            size: 300,
            cell: ({ getValue, row }) => (
                <div
                    className="cursor-pointer text-primary underline font-medium hover:text-primary/80"
                    onClick={() => onNoteClick?.(row.original)}
                >
                    {(getValue() as string) || '-'}
                </div>
            )
        },
        {
            accessorKey: 'tags',
            header: 'Tags',
            size: 200,
            cell: ({ getValue, row }) => {
                const tags = getValue();
                if (!tags || (Array.isArray(tags) && tags.length === 0)) {
                    return <div className="p-1">-</div>;
                }

                // Handle both array and string format for backward compatibility
                const tagArray = Array.isArray(tags) 
                    ? tags 
                    : (tags as string).split(',');
                
                const displayTags = tagArray.slice(0, 2);
                const remainingCount = tagArray.length - 2;

                return (
                    <div className="flex gap-1 flex-wrap p-1 items-center">
                        {displayTags.map((tag: string, index: number) => (
                            <Badge
                                key={`${row.original.noteId}-${index}`}
                                variant="secondary"
                                className="text-[0.7rem] h-5"
                            >
                                #{tag.trim()}
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
            accessorKey: 'description',
            header: 'Description',
            size: 500,
            cell: ({ getValue }) => (
                <div className="line-clamp-2 overflow-hidden text-ellipsis">
                    {(getValue() as string) || '-'}
                </div>
            )
        },
        {
            accessorKey: 'createdBy',
            header: 'Created By',
            size: 160,
            cell: ({ getValue }) => (getValue() as string) || '-'
        },
        {
            accessorKey: 'createdAt',
            header: 'Created Date',
            size: 180,
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? formatDateTime(new Date(value as string)) : '-';
            }
        },
        {
            accessorKey: 'isArchived',
            header: 'Status',
            size: 100,
            cell: ({ getValue }) => (
                <span className="text-sm font-medium">
                    {(getValue() as boolean) ? 'Inactive' : 'Active'}
                </span>
            )
        }
    ], [onNoteClick, selectedRowIds, sortedNotes.length]);

    // Create table instance
    const table = useReactTable({
        data: sortedNotes,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        state: {
            sorting,
            pagination,
        },
        getRowId: (row) => String(row.noteId),
    });

    // Handle error state
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    {error instanceof Error ? error.message : 'Unknown error occurred'}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="w-full h-full bg-background">
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
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr
                                    key={row.id}
                                    className={`border-b h-[50px] ${row.original.isArchived ? 'opacity-60 row-archived' : ''}`}
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
                <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                        {selectedRowIds.length > 0 && (
                            <span>{selectedRowIds.length} of {sortedNotes.length} row(s) selected. </span>
                        )}
                        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                        {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, sortedNotes.length)} of{' '}
                        {sortedNotes.length} results
                    </div>
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
        </div>
    );
});