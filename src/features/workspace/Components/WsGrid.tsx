/**
 * WsGrid - ws Grid Component
 * VSCode-style dark theme table for workspaces
 */

import React, { useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef, flexRender } from "@tanstack/react-table";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/shared";
import { Checkbox } from "@/shared";
import { Alert, AlertDescription } from "@/shared";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { useSideBarHelper } from "@/shell";
import {useWsGridHelper} from "../hooks/ws/useWsGrid.helper";
import {useWsTabHelper} from "../hooks/ws/useWsTab.helper";
import {Ws} from "../types/workspace.types";
import {useAuthStore} from "@/shared";

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
    const { searchQuery,filterViewKey } = useSideBarHelper();
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
                header: () => <div className="text-left">ID</div>,
                size: 20,
                cell: ({ getValue }) => <div className="text-left font-mono text-[11px] text-muted-foreground/80">#{getValue() as number}</div>,
            },
            {
                accessorKey: "name",
                header: () => <div className="text-left px-2">Workspace Name</div>,
                size: 200,
                cell: ({ getValue }) => <div className="truncate text-[13px] text-foreground text-left cursor-pointer px-2">{(getValue() as string) || "—"}</div>,
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
                header: () => <div className="text-left">Status</div>,
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
                            <div className="w-1.5 h-1.5 rounded-full bg-sa-danger"></div>
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
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
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
                className="flex-1 overflow-auto"
                onContextMenu={(e) => {
                    const target = e.target as HTMLElement;
                    const isClickedOnRow = target.closest("tr[data-row]");
                    if (!isClickedOnRow) {
                        openWsContextMenu(e);
                    }
                }}
            >
                <table className="w-full">
                    <thead className="bg-background sticky top-0 z-10">
                        {/* Column Headers */}
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-sa-border">
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="h-8 px-1 text-left align-middle text-[11px] font-medium uppercase tracking-wide text-muted-foreground" style={{ width: header.getSize() }}>
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
                                className={`h-9 cursor-pointer hover:bg-sa-hover transition-colors duration-100 ${row.getIsSelected() ? "bg-sa-hover-strong" : ""} ${row.original.deletedAt ? "opacity-60" : ""}`}
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
            <div className="flex h-9 items-center justify-between gap-2 px-3 bg-background border-t border-sa-border">
                <div className="flex-1 truncate text-[12px] text-left text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({totalCount} total)
                </div>

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="h-7 w-7 text-muted-foreground" title="First page">
                        <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-7 w-7 text-muted-foreground" title="Previous page">
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <div className="flex items-center gap-1 px-1.5 font-mono text-[12px]">
                        <span className="text-foreground">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-muted-foreground">/ {table.getPageCount()}</span>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-7 w-7 text-muted-foreground" title="Next page">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="h-7 w-7 text-muted-foreground"
                        title="Last page"
                    >
                        <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
