/**
 * ProjectGrid - Project Grid Component
 * VSCode-style dark theme table for projects
 */

import React, { useEffect, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
    flexRender,
} from "@tanstack/react-table";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { Project, useProjectStore } from "@/store/project/useProject.store";
import { useProjectGridHelper } from "@/hooks/project/useProjectGrid.helper";
import { useProjectTabHelper } from "@/hooks/project/useProjectTab.helper";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { RowSelectionState } from "@tanstack/react-table";
import { useAuthStore } from "@/store/index";
import { useGeneralStore } from "@/store/general/General.store";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

/**
 * ProjectGrid - project grid with table display
 */
export function ProjectGrid() {
    const {
        projects,
        totalCount,
        projectGridIsLoading,
        projectGridError,
        projectGridSorting,
        setProjectGridSorting,
        projectGridPagination,
        setProjectGridPagination,
        projectGridRowSelection,
        setProjectGridRowSelection,
        projectGridColumnFilters,
        setProjectGridColumnFilters,
        containerRef,
        setContainerWidth,
    } = useProjectStore();

    const { loadProjects, openProjectContextMenu } = useProjectGridHelper();
    const { updateMultiProjectTabIfOpen, openMultiProjectTab } = useProjectTabHelper();
    const { searchQuery } = useGridControlStore();
    const { $user } = useAuthStore();
    const { registriesByType,registries } = useGeneralStore();

    // Get status label from registry
    const getStatusLabel = (statusCode: string) => {
        const projectStatuses = registriesByType["project_status"] || [];
        const status = projectStatuses.find((s) => s.code === statusCode);
        return status?.description || statusCode;
    };

    // Handle row selection change - updates multi-project tab (opens if not exists, activates if not active)
    const handleRowSelectionChange = (updaterOrValue: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
        // Get new selection value
        const newSelection = typeof updaterOrValue === "function"
            ? updaterOrValue(projectGridRowSelection)
            : updaterOrValue;

        // Update store
        setProjectGridRowSelection(newSelection);

        // Get selected projects and open/update multi-project tab
        const selectedIds = Object.keys(newSelection).map((id) => parseInt(id));
        const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));

        // Open multi-project tab (creates if not exists, activates if not active, updates data)
        openMultiProjectTab(selectedProjects);
    };

    // Define columns for the data table
    const columns = useMemo<ColumnDef<Project>[]>(() => {
        return [
            {
                id: "select",
                header: ({ table }) => (
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={table.getIsAllPageRowsSelected()}
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                            aria-label="Select all"
                        />
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
                header: () => <div className="text-left text-sm">Project Name</div>,
                size: 200,
                cell: ({ getValue }) => (
                    <div className="text-sm text-primary text-left cursor-pointer hover:text-primary/80 px-2">
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
            // {
            //     accessorKey: "deletedAt",
            //     header: () => <div className="text-left text-sm">Deleted</div>,
            //     size: 60,
            //     enableSorting: true,
            //     filterFn: (row, columnId, filterValue) => {
            //         const deletedAt = row.original.deletedAt;
            //         if (filterValue === "null") {
            //             return deletedAt === null || deletedAt === undefined;
            //         }
            //         if (filterValue === "notNull") {
            //             return deletedAt !== null && deletedAt !== undefined;
            //         }
            //         return true;
            //     },
            //     cell: ({ getValue }) => {
            //         const deletedAt = getValue() as Date | null | undefined;

            //         if (!deletedAt) {
            //             return null;
            //         }

            //         return (
            //             <div className="flex items-center justify-start pl-2" title="Deleted">
            //                 <div className="w-2 h-2 rounded-full bg-destructive"></div>
            //             </div>
            //         );
            //     },
            // },
        ];
    }, [registries]);

    // Filter data by search query
    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return projects;
        }
        const query = searchQuery.toLowerCase();
        return projects.filter(
            (p) =>
                p.name?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query) ||
                String(p.id).includes(query)
        );
    }, [projects, searchQuery]);

    // Create table instance
    const table = useReactTable({
        data: filteredData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setProjectGridSorting,
        onPaginationChange: setProjectGridPagination,
        onRowSelectionChange: handleRowSelectionChange,
        onColumnFiltersChange: setProjectGridColumnFilters,
        state: {
            sorting: projectGridSorting,
            pagination: projectGridPagination,
            rowSelection: projectGridRowSelection,
            columnFilters: projectGridColumnFilters,
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

    // Load data when user is ready
    useEffect(() => {
        if (!$user.userId) return;
        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userId, projectGridPagination.pageIndex, projectGridPagination.pageSize]);

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
                                        className="h-[36px] px-1 text-left align-middle font-semibold text-muted-foreground"
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
                                className={`border-b h-[36px] cursor-pointer hover:bg-muted/50 transition-colors ${
                                    row.original.deletedAt ? "opacity-60" : ""
                                }`}
                                onClick={() => {
                                    // Toggle row selection (checkbox)
                                    row.toggleSelected(!row.getIsSelected());
                                }}
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

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-1 bg-background">
                <div className="flex-1 text-sm text-left text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({totalCount} total)
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
