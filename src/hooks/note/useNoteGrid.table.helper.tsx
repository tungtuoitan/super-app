import React, { useEffect, useMemo, useCallback } from "react";
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
import { constants } from "@/utils/constants";
import { useAuthStore } from "@/store/index";
import { useStandardRegistryStore } from "@/store/index";
import { WorkspaceLinksCell } from "@/Components/Note/WorkspaceLinksCell";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceStore } from "@/store/index";
import {useTreeHelper2} from "../workspace";

/**
 * NoteGrid - A flexible layout panel for displaying notes in a data table
 * VSCode-style dark theme table for notes
 *
 * @param onNoteClick - Callback when a note is clicked
 * @param sidebarMode - If true, shows only name column for compact sidebar view
 */
export function useNoteGridTableHelper(source?: string, disabledRowIds?: Set<number>) {
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

    const { registries } = useStandardRegistryStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { setSelectedWorkspaceId, setScrollToItem, setSelectedItemIds } = useWorkspaceStore();

    // Handle workspace navigation with highlight
    const handleWorkspaceNavigation = useCallback((workspaceId: number, workspaceItemId: number) => {
        if (!workspaceItemId) {
            return;
        }

        // Set workspace (will trigger load/expand)
        setSelectedWorkspaceId(workspaceId);

        // Set target item to scroll to (will be selected when tree renders)
        setSelectedItemIds([workspaceItemId]);
        setScrollToItem(true);

        // Navigate if not already at /workspace
        if (!location.pathname.includes('/workspace')) {
            navigate('/workspace');
        }
    }, [location.pathname, navigate, setSelectedWorkspaceId, setSelectedItemIds, setScrollToItem]);

    // Calculate which optional columns to show based on container width
    // Base columns width: select (36) + id (36) + name (280) = 352
    const showWorkspaceLinksColumn = containerWidth >= 462; // 352 + 110
    const showStatusColumn = containerWidth >= 572; // 352 + 110 + 110
    const showCreatedDateColumn = containerWidth >= 682; // 352 + 110 + 110 + 110
    const showDeletedColumn = containerWidth >= 742; // 352 + 110 + 110 + 110 + 60

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
                header: ({ table }) => {
                    // Calculate if all selectable rows are selected
                    const selectableRows = table.getRowModel().rows.filter(row => !disabledRowIds?.has(row.original.id));
                    const selectedSelectableRows = selectableRows.filter(row => row.getIsSelected());
                    const isAllSelectableSelected = selectableRows.length > 0 && selectedSelectableRows.length === selectableRows.length;
                    const isSomeSelectableSelected = selectedSelectableRows.length > 0 && selectedSelectableRows.length < selectableRows.length;

                    // Determine checked state: true, false, or 'indeterminate'
                    let checkedState: boolean | 'indeterminate' = false;
                    if (isAllSelectableSelected) {
                        checkedState = true;
                    } else if (isSomeSelectableSelected) {
                        checkedState = 'indeterminate';
                    }

                    return (
                        <div className="flex items-center justify-center">
                            <Checkbox
                                checked={checkedState}
                                onCheckedChange={(value) => {
                                    // Toggle only selectable rows
                                    selectableRows.forEach(row => {
                                        row.toggleSelected(!!value);
                                    });
                                }}
                                aria-label="Select all"
                            />
                        </div>
                    );
                },
                cell: ({ row }) => {
                    const isDisabled = disabledRowIds?.has(row.original.id) || false;
                    return (
                        <div className={`flex items-center justify-center ${isDisabled ? "opacity-30 cursor-pointer" : ""}`}>
                            <Checkbox
                                checked={row.getIsSelected()}
                                onCheckedChange={(value) => row.toggleSelected(!!value)}
                                aria-label="Select row"
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                                disabled={isDisabled}
                            />
                        </div>
                    );
                },
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
                cell: ({ getValue, row }) => <div className="pl-1 text-sm text-primary text-left cursor-pointer hover:text-primary/80">{(getValue() as string) || "—"}</div>,
            },
        ];

        // Optional columns (hiển thị khi có đủ chỗ, sắp xếp từ trái sang phải)
        const optionalColumns: ColumnDef<Note>[] = [];

        // Cột Location (Workspace Links) - đưa lên đầu tiên
        if (showWorkspaceLinksColumn) {
            optionalColumns.push({
                accessorKey: "workspaceLinks",
                header: () => <div className="text-left text-sm">Location</div>,
                size: 40,
                enableSorting: false,
                cell: ({ row, table }) => {
                    const links = row.original.workspaceLinks || [];
                    const count = links.length;
                    const rowIndex = row.index;
                    const isFirstRows = rowIndex < 3; // First 3 rows show tooltip below
                    return (
                        <WorkspaceLinksCell
                            count={count}
                            links={links}
                            onWorkspaceClick={handleWorkspaceNavigation}
                            source={source}
                            tooltipPosition={isFirstRows ? "bottom" : "top"}
                        />
                    );
                },
            });
        }

        // Cột Status (statusCode)
        if (showStatusColumn) {
            optionalColumns.push({
                accessorKey: "statusCode",
                header: () => <div className="text-left text-sm">Status</div>,
                size: 80,
                cell: ({ getValue }) => {
                    const statusCode = getValue() as string | undefined;
                    return <div className="pl-1 text-sm text-zinc-400 text-left">{getStatusDescription(statusCode)}</div>;
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
                    return <div className="text-sm text-zinc-400 text-left pl-2">{formattedDate}</div>;
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
    }, [containerWidth, showStatusColumn, showWorkspaceLinksColumn, showCreatedDateColumn, showDeletedColumn, registries, handleWorkspaceNavigation]);

    // Create table instance
    const table = useReactTable({
        data: notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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
