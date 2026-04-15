import React, { useEffect, useMemo, useCallback } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef } from "@tanstack/react-table";
import { useNoteGridStore } from "../store/useNoteGrid.store";
import { Note } from "../types/note.types";
import { WorkspaceLinksCell } from "../Components/WorkspaceLinksCell";
import { useGeneralStore } from "@/store/index";
import { useWorkspaceStore } from "@/features/workspace/store/Workspace.store";
import { constants } from "@/utils/constants";
import { useNavigate, useLocation } from "react-router-dom";

export function useNoteGridTableHelper(source?: string, disabledRowIds?: Set<number>) {
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

    const { registries } = useGeneralStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { setSelectedWorkspaceId, setScrollToItem, setSelectedItemIds } = useWorkspaceStore();

    const handleWorkspaceNavigation = useCallback((workspaceId: number, workspaceItemId: number) => {
        if (!workspaceItemId) {
            return;
        }

        setSelectedWorkspaceId(workspaceId);
        setSelectedItemIds([workspaceItemId]);
        setScrollToItem(true);

        if (!location.pathname.includes('/workspace')) {
            navigate('/workspace');
        }
    }, [location.pathname, navigate, setSelectedWorkspaceId, setSelectedItemIds, setScrollToItem]);

    const showWorkspaceLinksColumn = containerWidth >= 462;
    const showStatusColumn = containerWidth >= 572;
    const showCreatedDateColumn = containerWidth >= 682;
    const showDeletedColumn = containerWidth >= 742;

    const columns = useMemo<ColumnDef<Note>[]>(() => {
        const getStatusDescription = (statusCode: string | undefined): string => {
            if (!statusCode) return "-";
            const status = registries.find((r) => r.code === statusCode && r.type === constants.standardRegistryFE.types.noteStatus);
            return status?.description || statusCode;
        };

        const baseColumns: ColumnDef<Note>[] = [
            {
                id: "select",
                header: ({ table }) => {
                    const selectableRows = table.getRowModel().rows.filter(row => !disabledRowIds?.has(row.original.id));
                    const selectedSelectableRows = selectableRows.filter(row => row.getIsSelected());
                    const isAllSelectableSelected = selectableRows.length > 0 && selectedSelectableRows.length === selectableRows.length;
                    const isSomeSelectableSelected = selectedSelectableRows.length > 0 && selectedSelectableRows.length < selectableRows.length;

                    let checkedState: boolean | 'indeterminate' = false;
                    if (isAllSelectableSelected) {
                        checkedState = true;
                    } else if (isSomeSelectableSelected) {
                        checkedState = 'indeterminate';
                    }

                    return (
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={checkedState === true}
                                ref={(el) => { if (el) el.indeterminate = checkedState === 'indeterminate'; }}
                                onChange={(e) => {
                                    selectableRows.forEach(row => {
                                        row.toggleSelected(!!e.target.checked);
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
                            <input
                                type="checkbox"
                                checked={row.getIsSelected()}
                                onChange={(e) => row.toggleSelected(!!e.target.checked)}
                                aria-label="Select row"
                                onClick={(e) => e.stopPropagation()}
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
                cell: ({ getValue }) => <div className="pl-1 text-sm text-primary text-left cursor-pointer hover:text-primary/80">{(getValue() as string) || "—"}</div>,
            },
        ];

        const optionalColumns: ColumnDef<Note>[] = [];

        if (showWorkspaceLinksColumn) {
            optionalColumns.push({
                accessorKey: "workspaceLinks",
                header: () => <div className="text-left text-sm">Location</div>,
                size: 40,
                enableSorting: false,
                cell: ({ row }) => {
                    const links = row.original.workspaceLinks || [];
                    const count = links.length;
                    const rowIndex = row.index;
                    const isFirstRows = rowIndex < 3;
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
                    return true;
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
