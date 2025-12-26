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
import { useAuthStore } from "@/store/index";
import { useStandardRegistryStore } from "@/store/index";

/**
 * NoteGrid - A flexible layout panel for displaying notes in a data table
 * VSCode-style dark theme table for notes
 *
 * @param onNoteClick - Callback when a note is clicked
 * @param sidebarMode - If true, shows only name column for compact sidebar view
 */
export function useNoteGridTableHelper() {
    // State từ centralized store
    const {
        notes,
        noteGridSorting,
        setNoteGridSorting,
        noteGridPagination,
        setNoteGridPagination,
        noteGridRowSelection,
        setNoteGridRowSelection,
        noteGridColumnFilters,
        setNoteGridColumnFilters,
        containerWidth,
    } = useNoteGridStore();

    const { searchQuery } = useGridControlStore();
    const { registries } = useStandardRegistryStore();

    // Calculate which optional columns to show based on container width
    // Base columns width: select (36) + id (36) + name (280) = 352
    const showStatusColumn = containerWidth >= 462; // 352 + 110
    const showCreatedDateColumn = containerWidth >= 572; // 352 + 110 + 110
    const showDeletedColumn = containerWidth >= 632; // 352 + 110 + 110 + 60

    // Define columns for the data table
    const columns = useMemo<ColumnDef<Note>[]>(() => {
        // Get status description from standardRegistry
        const getStatusDescription = (statusCode: string | undefined): string => {
            if (!statusCode) return "-";
            const status = registries.find((r) => r.code === statusCode && r.type === constants.standardRegistryFE.types.noteStatus);
            return status?.description || statusCode;
        };

        // Base columns (always visible - không bị ảnh hưởng bởi responsive)
        const baseColumns: ColumnDef<Note>[] = [
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
                size: 36,
                minSize: 36,
                maxSize: 36,
                enableSorting: false,
                enableHiding: false,
                enableResizing: false,
            },
            {
                accessorKey: "id",
                header: () => <div className="text-left text-sm">ID</div>,
                size: 36,
                minSize: 36,
                maxSize: 36,
                enableResizing: false,
                cell: ({ getValue }) => <div className="text-left text-sm">{getValue() as number}</div>,
            },
            {
                accessorKey: "name",
                header: () => <div className="text-left text-sm">Note Name</div>,
                size: 280,
                minSize: 280,
                maxSize: 280,
                enableResizing: false,
                cell: ({ getValue, row }) => <div className="text-sm text-primary text-left cursor-pointer hover:text-primary/80">{(getValue() as string) || "—"}</div>,
            },
        ];

        // Optional columns (hiển thị khi có đủ chỗ, sắp xếp từ trái sang phải)
        const optionalColumns: ColumnDef<Note>[] = [];

        // Cột Status (statusCode)
        if (showStatusColumn) {
            optionalColumns.push({
                accessorKey: "statusCode",
                header: () => <div className="text-left text-sm">Status</div>,
                size: 80,
                cell: ({ getValue }) => {
                    const statusCode = getValue() as string | undefined;
                    return <div className="text-sm text-zinc-400 text-left">{getStatusDescription(statusCode)}</div>;
                },
            });
        }

        // Cột Created Date
        if (showCreatedDateColumn) {
            optionalColumns.push({
                accessorKey: "createdAt",
                header: () => <div className="text-left text-sm">Created Date</div>,
                size: 110,
                cell: ({ getValue }) => {
                    const createdAt = getValue() as Date;
                    const date = new Date(createdAt);
                    const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
                    return <div className="text-sm text-zinc-400 text-left">{formattedDate}</div>;
                },
            });
        }

        // Cột Deleted (di chuyển ra cuối cùng)
        if (showDeletedColumn) {
            optionalColumns.push({
                accessorKey: "deletedAt",
                header: () => <div className="text-left text-sm">Deleted</div>,
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
            });
        }

        return [...baseColumns, ...optionalColumns];
    }, [containerWidth, showStatusColumn, showCreatedDateColumn, showDeletedColumn, registries]);

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
                String(note.id).includes(query)
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

    return {
        table,
    };
}
