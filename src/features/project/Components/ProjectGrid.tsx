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
import { Button } from "@/shared";
import { Alert, AlertDescription } from "@/shared";
import { useProjectStore } from "../store/useProject.store";
import { useProjectGridHelper } from "../hooks/useProjectGrid.helper";
import { useProjectTabHelper } from "../hooks/useProjectTab.helper";
import { useProjectGridSelector } from "../Selectors/useProjectGrid.selector";
import { useProjectGridHeadless } from "../hooks/useProjectGrid.headless";
import { TaskStatusIcon } from "@/shared";
import {Project} from "../types/project.types";

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
                accessorKey: "status",
                header: () => null,
                size: 32,
                cell: ({ getValue }) => {
                    const status = getValue() as string;
                    return (
                        <div className="flex items-center justify-center">
                            <TaskStatusIcon status={status} title={status ? getStatusLabel(status) : "No status"} />
                        </div>
                    );
                },
            },
            {
                accessorKey: "image",
                header: () => null,
                size: 28,
                cell: ({ getValue }) => {
                    const img = getValue() as string | null | undefined;
                    return (
                        <div className="flex items-center justify-center">
                            {img?.startsWith("data:image") ? (
                                <img src={img} alt="" className="h-5 w-5 rounded-md object-cover" />
                            ) : (
                                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "name",
                header: () => null,
                cell: ({ getValue }) => (
                    <div className="truncate px-1.5 text-left text-[13px] text-foreground">
                        {(getValue() as string) || "—"}
                    </div>
                ),
            },
            {
                accessorKey: "id",
                header: () => null,
                size: 44,
                cell: ({ getValue }) => <div className="pr-3 text-right font-mono text-[11px] text-muted-foreground/80">#{getValue() as number}</div>,
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
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
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
                className="flex-1 overflow-auto py-1"
                onContextMenu={(e) => {
                    const target = e.target as HTMLElement;
                    const isClickedOnRow = target.closest("tr[data-row]");
                    if (!isClickedOnRow) {
                        openProjectContextMenu(e);
                    }
                }}
            >
                <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                        {table.getAllLeafColumns().map((column) => (
                            <col key={column.id} style={{ width: column.id === "name" ? undefined : column.getSize() }} />
                        ))}
                    </colgroup>
                    <tbody>
                        {table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                data-row
                                className={`h-9 cursor-pointer hover:bg-sa-hover transition-colors duration-100 ${
                                    row.original.deletedAt ? "opacity-60" : ""
                                }`}
                                onClick={() => openProjectTab(row.original)}
                                onContextMenu={(e) => {
                                    e.stopPropagation();
                                    openProjectContextMenu(e, row);
                                }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="overflow-hidden text-left">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Project style */}
            <div className="flex h-9 items-center justify-between gap-2 px-3 bg-background border-t border-sa-border">
                <div className="flex-1 truncate text-[12px] text-left text-muted-foreground">
                    {totalCount} project{totalCount !== 1 ? "s" : ""}
                </div>

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="h-7 w-7 text-muted-foreground"
                        title="First page"
                    >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-7 w-7 text-muted-foreground"
                        title="Previous page"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <div className="flex items-center gap-1 px-1.5 font-mono text-[12px]">
                        <span className="text-foreground">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-muted-foreground">/ {table.getPageCount()}</span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-7 w-7 text-muted-foreground"
                        title="Next page"
                    >
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
