/**
 * WsGrid - ws Grid Component
 * VSCode-style dark theme table for workspaces
 */

import React, { useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef, flexRender } from "@tanstack/react-table";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/shared";
import { Checkbox } from "@/shared";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { useGridControlStore } from "@/shared/store/useGridControl.store";
import {useWsGridHelper} from "../hooks/ws/useWsGrid.helper";
import {useWsTabHelper} from "../hooks/ws/useWsTab.helper";
import {Ws} from "../types/workspace.types";
import {useAuthStore} from "@/shell";

/**
 * WsGrid - ws grid with table display
 */
export function WsGrid() {
    // State from centralized store
    const {
        workspaces,
        totalCount,
        wsGridIsLoading,
        wsGridError,
        wsGridSorting,
        setWsGridSorting,
        wsGridPagination,
        setWsGridPagination,
        wsGridRowSelection,
        setWsGridRowSelection,
        wsGridColumnFilters,
        setWsGridColumnFilters,
        containerRef,
        setContainerWidth,
    } = useWsStore();

    const { loadWorkspaces, openWsContextMenu } = useWsGridHelper();
    const { openWorkspaceTab } = useWsTabHelper();
    const { searchQuery,filterViewKey } = useGridControlStore();
    const { $user } = useAuthStore();

    // Define columns for the data table
    const columns = useMemo<ColumnDef<Ws>[]>(() => {
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
                            onClick={(e) => e.stopPropagation()}
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
                header: () => <div className="text-left text-sm">Workspace Name</div>,
                size: 200,
                cell: ({ getValue }) => <div className="text-sm text-primary text-left cursor-pointer hover:text-primary/80 px-2">{(getValue() as string) || "—"}</div>,
            },
            // {
            //     accessorKey: 'description',
            //     header: () => (
            //         <div className="text-left text-sm">Description</div>
            //     ),
            //     size: 300,
            //     cell: ({ getValue }) => (
            //         <div className="text-sm text-muted-foreground line-clamp-1 overflow-hidden text-ellipsis px-2">
            //             {(getValue() as string) || '—'}
            //         </div>
            //     ),
            // },
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
    const filteredData = (() => {
        if (!searchQuery) {
            return workspaces;
        }
        const query = searchQuery.toLowerCase();
        return workspaces.filter((ws) => ws.name?.toLowerCase().includes(query) || ws.description?.toLowerCase().includes(query) || String(ws.id).includes(query));
    })()

    // Create table instance
    const table = useReactTable({
        data: filteredData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setWsGridSorting,
        onPaginationChange: setWsGridPagination,
        onRowSelectionChange: setWsGridRowSelection,
        onColumnFiltersChange: setWsGridColumnFilters,
        state: {
            sorting: wsGridSorting,
            pagination: wsGridPagination,
            rowSelection: wsGridRowSelection,
            columnFilters: wsGridColumnFilters,
        },
        getRowId: (row) => String(row.id),
        enableRowSelection: true,
    });

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Load data when user is ready or pagination changes
    useEffect(() => {
        // this will run every time user login, or $user.filters change, or pagination changes
        if (!$user.userId || !$user.filters) return;
        loadWorkspaces();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userId, $user.userToken, $user.filters?.wsGrid, wsGridPagination.pageIndex, wsGridPagination.pageSize]);


    // Update GridControl when wsGridColumnFilters change - no longer needed for backend filtering
    // Filters are now stored in userProfile and applied on backend

    return (
        <div ref={containerRef} className="w-full h-full bg-background flex flex-col relative">
            {/* Loading Overlay */}
            {wsGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Error Overlay */}
            {wsGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load workspaces</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Table */}
            <div
                className="flex-1 overflow-auto rounded-md border"
                onContextMenu={(e) => {
                    const target = e.target as HTMLElement;
                    const isClickedOnRow = target.closest("tr[data-row]");
                    if (!isClickedOnRow) {
                        openWsContextMenu(e);
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
                                onClick={() => {
                                    openWorkspaceTab(row.original);
                                }}
                                onContextMenu={(e) => {
                                    e.stopPropagation();
                                    openWsContextMenu(e, row);
                                }}
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
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({totalCount} total)
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
