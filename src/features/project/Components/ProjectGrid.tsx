/**
 * ProjectGrid - Project Grid Component
 * VSCode-style dark theme table for projects
 * Pure UI — reads from selector, helper, headless. NO business logic.
 */

import React, { useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
    flexRender,
} from "@tanstack/react-table";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FolderOpen } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { Project, useProjectStore } from "../store/useProject.store";
import { useProjectGridHelper } from "../hooks/useProjectGrid.helper";
import { useProjectTabHelper } from "../hooks/useProjectTab.helper";
import { useProjectGridSelector } from "../Selectors/useProjectGrid.selector";
import { useProjectGridHeadless } from "../HeadlessComponents/useProjectGrid.headless";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

/**
 * ProjectGrid - project grid with table display
 * Pure UI — NO props.
 */
export function ProjectGrid() {
    const {
        totalCount,
        projectGridIsLoading,
        projectGridError,
        projectGridSorting,
        setProjectGridSorting,
        projectGridPagination,
        setProjectGridPagination,
        projectGridColumnFilters,
        setProjectGridColumnFilters,
        containerRef,
    } = useProjectStore();

    // ── Handlers (from helper) ───────────────────────────
    const { openProjectContextMenu } = useProjectGridHelper();
    const { openProjectTab } = useProjectTabHelper();

    // ── Computed values (from selector) ──────────────────
    const { getStatusLabel, filteredData } = useProjectGridSelector();

    // ── Side-effects (headless) ──────────────────────────
    useProjectGridHeadless();

    // Define columns for the data table (contains JSX — acceptable in UI)
    const columns = useMemo<ColumnDef<Project>[]>(() => {
        return [
            {
                accessorKey: "id",
                header: () => <div className="text-left text-sm font-semibold ml-2">ID</div>,
                size: 20,
                cell: ({ getValue }) => <div className="text-left text-sm font-medium ml-3">{getValue() as number}</div>,
            },
            {
                accessorKey: "image",
                header: () => null,
                size: 40,
                cell: ({ getValue }) => {
                    const img = getValue() as string | null | undefined;
                    return (
                        <div className="flex items-center justify-center px-1">
                            {img?.startsWith("data:image") ? (
                                <img src={img} alt="" className="w-7 h-7 rounded object-cover" />
                            ) : (
                                <FolderOpen className="w-4 h-4 text-muted-foreground/50" />
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "name",
                header: () => <div className="text-left text-sm font-semibold">PROJECT NAME</div>,
                size: 200,
                cell: ({ getValue }) => (
                    <div className="text-sm font-semibold text-primary text-left cursor-pointer hover:text-primary/80 px-2 uppercase tracking-wide">
                        {(getValue() as string) || "—"}
                    </div>
                ),
            },
            {
                accessorKey: "status",
                header: () => <div className="text-left text-sm">Status</div>,
                size: 120,
                cell: ({ getValue }) => {
                    const status = getValue() as string;
                    if (!status) return <div className="px-2">—</div>;
                    return (
                        <div className="px-2">
                            <ProjectStatusBadge status={status} label={getStatusLabel(status)} size="sm" />
                        </div>
                    );
                },
            },
        ];
    }, [getStatusLabel]);

    // Create table instance
    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setProjectGridSorting,
        onPaginationChange: setProjectGridPagination,
        onColumnFiltersChange: setProjectGridColumnFilters,
        state: {
            sorting: projectGridSorting,
            pagination: projectGridPagination,
            columnFilters: projectGridColumnFilters,
        },
        getRowId: (row) => String(row.id),
    });

    return (
        <div ref={containerRef} className="w-full h-full bg-background flex flex-col relative">
            {/* Loading Overlay */}
            {projectGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Error Overlay */}
            {projectGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load projects</AlertDescription>
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
                        openProjectContextMenu(e);
                    }
                }}
            >
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="h-[44px] px-1 text-left align-middle font-semibold text-muted-foreground uppercase tracking-wider text-xs"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
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
                                className={`border-b h-[48px] cursor-pointer hover:bg-muted/50 transition-colors ${
                                    row.original.deletedAt ? "opacity-60" : ""
                                }`}
                                onClick={() => openProjectTab(row.original)}
                                onContextMenu={(e) => {
                                    e.stopPropagation();
                                    openProjectContextMenu(e, row);
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

            {/* Pagination - Project style */}
            <div className="flex items-center justify-between px-4 py-2 bg-background border-t-2 border-primary/20">
                <div className="flex-1 text-xs text-left text-muted-foreground font-semibold uppercase tracking-wide">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({totalCount} Projects)
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
                        <span className="text-sm font-medium">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-sm text-muted-foreground">/ {table.getPageCount()}</span>
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
