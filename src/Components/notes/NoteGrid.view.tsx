// NoteGrid.view.tsx (Dumb Component)
import { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    SortingState
} from '@tanstack/react-table';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Loader2 } from 'lucide-react';
import {Note} from '@/types/note.types';

// Internal types

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
 * - Rendering the data table with notes
 * - Displaying loading and error states
 * - Column definitions and cell rendering
 * - Table styling and configuration
 * - Calling event handlers passed from container
 * 
 * All business logic and state management is handled by the container component.
 * 
 * @param props - Component props
 * @returns Data table view with note display functionality
 */
export function NoteGridView({ notes, loading, error, onNoteClick }: NoteGridViewProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    };

    const getTypeVariant = (type?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            'Meeting': 'default',
            'Brainstorm': 'secondary',
            'Research': 'outline',
            'Bug': 'destructive',
            'default': 'outline'
        };
        return variants[type || 'default'] || variants.default;
    };

    const columns = useMemo<ColumnDef<Note>[]>(() => [
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
            size: 400,
            cell: ({ getValue, row }) => (
                <div
                    className="cursor-pointer text-primary underline font-medium hover:text-primary/80"
                    onClick={() => onNoteClick(row.original)}
                >
                    {getValue() as string}
                </div>
            ),
        },
        {
            accessorKey: 'type',
            header: 'Type',
            size: 120,
            cell: ({ getValue }) => (
                <Badge variant={getTypeVariant(getValue() as string)}>
                    {(getValue() as string) || 'N/A'}
                </Badge>
            ),
        },
        {
            accessorKey: 'description',
            header: 'Description',
            size: 500,
            cell: ({ getValue }) => (
                <div className="line-clamp-2 overflow-hidden text-ellipsis">
                    {(getValue() as string) || '-'}
                </div>
            ),
        },
        {
            accessorKey: 'tags',
            header: 'Tags',
            size: 200,
            cell: ({ getValue, row }) => {
                const tags = getValue() as string;
                if (!tags) return <div className="p-1">-</div>;

                const tagArray = tags.split(',');
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
            },
        },
        {
            accessorKey: 'createdBy',
            header: 'Created By',
            size: 160,
        },
        {
            accessorKey: 'createdAt',
            header: 'Created Date',
            size: 140,
            cell: ({ getValue }) => formatDate(new Date(getValue() as string)),
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
            },
        },
    ], [onNoteClick]);

    const table = useReactTable({
        data: notes,
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
                <AlertDescription>{error}</AlertDescription>
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
                        {loading ? (
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
                                    className={`border-b h-[50px] ${row.original.isArchived ? 'opacity-60' : ''}`}
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
        </div>
    );
}