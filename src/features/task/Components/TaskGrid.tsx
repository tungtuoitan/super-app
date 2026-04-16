/**
 * TaskGrid - Task Grid Component
 * VSCode-style dark theme table for tasks
 * Shows tasks for a specific project
 * Supports inline status/priority editing and drag & drop for subtask management
 *
 * Pure UI — logic lives in useTaskListSelector, useTaskGrid2Helper, TaskListHeadless
 */

import React from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef, flexRender } from "@tanstack/react-table";
import { Loader2, CornerDownRight } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Task, useTaskStore } from "../store/useTask.store";
import { useTaskGridHelper } from "../hooks/useTaskGrid.helper";
import { useTaskTabHelper } from "../hooks/useTaskTab.helper";
import { useTaskListSelector } from "../Selectors/TaskListSelector";
import { useTaskGrid2Helper } from "../hooks/useTaskGrid2.helper";
import { TaskListHeadless } from "../HeadlessComponents/TaskListHeadless";
import { useGridControlStore } from "@/store/useGridControl.store";
import { StatusCell, PriorityCell } from "@/features/multiProject/Components/small/MultiProjectTaskListCells";
import { DateRangeCell, DraggableRow } from "@/features/multiProject/Components/small/MultiProjectTaskListRow";
import { MakeIndependentDropZone } from "@/features/multiProject/Components/small/MakeIndependentDropZone";

/**
 * TaskGrid - task grid with table display
 */
export function TaskGrid() {
    const {
        taskGridIsLoading,
        taskGridError,
        taskGridSorting,
        setTaskGridSorting,
        taskGridRowSelection,
        setTaskGridRowSelection,
        taskGridColumnFilters,
        setTaskGridColumnFilters,
        taskContainerRef,
    } = useTaskStore();

    const { projectId } = useGridControlStore();
    const { openTaskContextMenu } = useTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { statusOptions, priorityOptions, filteredTasks, sortedTasks } = useTaskListSelector();
    const { handleInlineUpdate, handleInlineDateUpdate, handleDropTaskOntoTask, handleMakeIndependent, showDropError } = useTaskGrid2Helper();

    // Handle context menu
    const handleContextMenu = (event: React.MouseEvent, row?: any) => {
        openTaskContextMenu(event, row, projectId ?? undefined, (task: Task) => {
            openTaskTab(task);
        });
    };

    // Column definitions — deps (statusOptions, priorityOptions, callbacks) are already
    // memoized in selector/helper; cell components are React.memo'd. No useMemo needed.
    const columns: ColumnDef<Task>[] = [
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
            size: 40,
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "id",
            header: () => <div className="text-left text-sm">ID</div>,
            size: 60,
            cell: ({ getValue }) => <div className="text-left text-sm px-2">{getValue() as number}</div>,
        },
        {
            accessorKey: "title",
            header: () => <div className="text-left text-sm">Title</div>,
            size: 300,
            cell: ({ row }) => {
                const task = row.original;
                const isSubtask = !!task.parentTaskId;
                return (
                    <div className={`text-sm text-primary text-left cursor-pointer hover:text-primary/80 px-2 truncate flex items-center gap-1 ${isSubtask ? "pl-6" : ""}`}>
                        {isSubtask && <CornerDownRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        <span className="truncate">{task.title || "—"}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "status",
            header: () => <div className="text-left text-sm">Status</div>,
            size: 120,
            cell: ({ row }) => <StatusCell task={row.original} statusOptions={statusOptions} onUpdate={handleInlineUpdate} />,
        },
        {
            accessorKey: "priority",
            header: () => <div className="text-left text-sm">Priority</div>,
            size: 120,
            cell: ({ row }) => <PriorityCell task={row.original} priorityOptions={priorityOptions} onUpdate={handleInlineUpdate} />,
        },
        {
            id: "dateRange",
            header: () => <div className="text-left text-sm">Date Range</div>,
            size: 200,
            cell: ({ row }) => (
                <DateRangeCell
                    task={row.original}
                    onStartDateUpdate={handleInlineDateUpdate}
                    onEndDateUpdate={handleInlineDateUpdate}
                />
            ),
        },
    ];

    // Create table instance
    const table = useReactTable({
        data: sortedTasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setTaskGridSorting,
        onRowSelectionChange: setTaskGridRowSelection,
        onColumnFiltersChange: setTaskGridColumnFilters,
        state: {
            sorting: taskGridSorting,
            rowSelection: taskGridRowSelection,
            columnFilters: taskGridColumnFilters,
        },
        getRowId: (row) => String(row.id),
        enableRowSelection: true,
    });

    return (
        <div ref={taskContainerRef} className="w-full h-full bg-background flex flex-col relative">
            <TaskListHeadless />

            {/* Loading Overlay */}
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Error Overlay */}
            {taskGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load tasks</AlertDescription>
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
                        handleContextMenu(e);
                    }
                }}
            >
                <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="h-[36px] px-1 text-left align-middle font-semibold text-muted-foreground"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    {/* Empty state - no text to avoid flicker on tab switch */}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <DraggableRow
                                    key={row.id}
                                    row={row}
                                    allTasks={filteredTasks}
                                    onDrop={handleDropTaskOntoTask}
                                    onMakeIndependent={handleMakeIndependent}
                                    onRowClick={openTaskTab}
                                    onContextMenu={handleContextMenu}
                                    showError={showDropError}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Make Independent Drop Zone */}
            <MakeIndependentDropZone onDrop={handleMakeIndependent} showError={showDropError} />

            {/* Footer with count */}
            <div className="flex items-center px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                </div>
            </div>
        </div>
    );
}
