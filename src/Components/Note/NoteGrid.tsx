import React, { useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef, flexRender } from "@tanstack/react-table";
import { Loader2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { Note } from "@/types/note.types";
import { noteService } from "@/services/note.service";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { useNoteGridHelper } from "@/hooks/note/useNoteGrid.helper";
import { useGridControlHelper } from "@/hooks/vsCode/useGridControl.helper";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { constants } from "@/utils/constants";

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
        noteGridIsLoading,
        setNoteGridIsLoading,
        noteGridError,
        setNoteGridError,
        noteGridSorting,
        setNoteGridSorting,
        noteGridPagination,
        setNoteGridPagination,
        noteGridRowSelection,
        setNoteGridRowSelection,
        noteGridColumnFilters,
        setNoteGridColumnFilters,
    } = useNoteGridStore();

    const { openTab } = useEditorTabHelper();
    const { loadNotes, openNoteContextMenu } = useNoteGridHelper();
    const { registerGrid, unregisterGrid } = useGridControlHelper();
    const { searchQuery } = useGridControlStore();

    // Define columns for the data table
    const columns = useMemo<ColumnDef<Note>[]>(() => {
        // Full mode: show all columns
        return [
            {
                id: "select",
                header: ({ table }) => (
                    <div className="flex items-center justify-center">
                        <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all" />
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
                size: 20,
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "id",
                header: () => <div className="text-left text-sm">ID</div>,
                size: 20,
                cell: ({ getValue }) => <div className="text-left text-sm">{getValue() as number}</div>,
            },
            {
                accessorKey: "name",
                header: () => <div className="text-left text-sm">Note Name</div>,
                size: 200,
                cell: ({ getValue, row }) => <div className="text-sm text-primary text-left cursor-pointer hover:text-primary/80">{(getValue() as string) || "—"}</div>,
            },
            {
                accessorKey: "deletedAt",
                header: () => <div className="text-left text-sm">Status</div>,
                size: 60,
                enableSorting: true,
                filterFn: (row, columnId, filterValue) => {
                    const deletedAt = row.original.deletedAt;
                    if (filterValue === "null") {
                        return deletedAt === null || deletedAt === undefined;
                    }
                    if (filterValue === "notNull") {
                        return deletedAt !== null && deletedAt !== undefined;
                    }
                    return true; // 'all' - show everything
                },
                cell: ({ getValue }) => {
                    const deletedAt = getValue() as Date | null | undefined;

                    if (!deletedAt) {
                        return null;
                    }

                    return (
                        <div className="flex items-center justify-start pl-2" title="Deleted">
                            <div className="w-2 h-2 rounded-full bg-destructive"></div>
                        </div>
                    );
                },
            },
        ];
    }, []);

    // Filter data by search query
    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return notes;
        }
        const query = searchQuery.toLowerCase();
        return notes.filter(
            (note) =>
                note.name?.toLowerCase().includes(query) ||
                note.description?.toLowerCase().includes(query) ||
                note.type?.toLowerCase().includes(query) ||
                String(note.id).includes(query),
        );
    }, [notes, searchQuery]);

    // Create table instance
    const table = useReactTable({
        data: filteredData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setNoteGridSorting,
        onPaginationChange: setNoteGridPagination,
        onRowSelectionChange: setNoteGridRowSelection,
        onColumnFiltersChange: setNoteGridColumnFilters,
        state: {
            sorting: noteGridSorting,
            pagination: noteGridPagination,
            rowSelection: noteGridRowSelection,
            columnFilters: noteGridColumnFilters,
        },
        getRowId: (row) => String(row.id),
        enableRowSelection: true,
    });

    // Register grid with GridControl and load data
    useEffect(() => {
        loadNotes();

        // Set default filter to Active Only
        const deletedAtColumn = table.getColumn("deletedAt");
        if (deletedAtColumn && !noteGridColumnFilters.length) {
            deletedAtColumn.setFilterValue("null");
        }

        // Register this grid with GridControl
        registerGrid(constants.modules.note, constants.filters.views.noteGrid);

        // Cleanup on unmount
        return () => {
            unregisterGrid();
        };
    }, []);

    // Update GridControl when columnFilters change - no longer needed for backend filtering
    // Filters are now stored in userProfile and applied on backend

    return (
        <div className="w-full h-full bg-background flex flex-col relative">
            {/* Loading Overlay */}
            {noteGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Error Overlay */}
            {noteGridError && (
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
                    const isClickedOnRow = target.closest("tr[data-row]");
                    if (!isClickedOnRow) {
                        openNoteContextMenu(e);
                    }
                }}
            >
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        {/* Column Headers */}
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b">
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="h-[36px] px-1 text-left align-middle font-semibold text-muted-foreground" style={{ width: header.getSize() }}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                data-row
                                className={`border-b h-[36px] cursor-pointer hover:bg-muted/50 transition-colors ${row.original.deletedAt ? "opacity-60" : ""}`}
                                onClick={() => openTab(row.original)}
                                onContextMenu={(e) => openNoteContextMenu(e, row)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="text-left">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({notes.length} total)
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="h-8 w-8" title="First page">
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 w-8" title="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 px-2">
                        <span className="text-sm font-medium">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-sm text-muted-foreground">/ {table.getPageCount()}</span>
                    </div>

                    <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 w-8" title="Next page">
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
