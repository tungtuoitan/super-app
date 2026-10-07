/**
 * TaskGrid - Task list for a single project (Linear-style, #1514)
 * Summary card + tasks grouped by status (collapsible, sticky headers) + 36px rows.
 * Supports inline status/priority editing, date editing, row selection, context menu
 * and drag & drop for subtask management.
 *
 * Pure UI — logic lives in useTaskListSelector, useTaskGridUpdateHelper, useTaskListHeadless
 */

import React, { useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef } from "@tanstack/react-table";
import { Loader2, CornerDownRight, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/shared";
import { Alert, AlertDescription } from "@/shared";
import type { Task } from "@/features/taskDetail";
import { useTaskGridHelper } from "../hooks/taskList/useTaskGrid.helper";
import { useTaskTabHelper } from "@/features/taskDetail";
import { useTaskListSelector } from "../Selectors/TaskListSelector";
import { useTaskGridUpdateHelper } from "../hooks/taskList/useTaskGridUpdate.helper";
import { useTaskListHeadless } from "../hooks/taskList/useTaskList.headless";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import { MakeIndependentDropZone } from "@/features/taskDetail";
import { DateRangeCell } from "../../Components/DateRangeCell";
import { usePTaskStore } from "../../store/usePTask.store";
import { TaskOptionPicker } from "./small/TaskOptionPicker";
import { TaskGroupedTable } from "./small/TaskGroupedTable";
import { TaskListSummary } from "./small/TaskListSummary";
import { groupByStatus, initialCollapsedGroups } from "../utils/taskGroup.utils";
import { taskGroupConstants } from "../taskGroup.constants";

/**
 * TaskGrid - task grid with table display
 */
export function TaskGrid() {
    useTaskListHeadless();
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
    } = usePTaskStore();

    const { projectId } = useProjectDetailStore();
    const { openTaskContextMenu } = useTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { currentProject, statusOptions, priorityOptions, filteredTasks, sortedTasks } = useTaskListSelector();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(initialCollapsedGroups);
    const { handleInlineUpdate, handleInlineDateUpdate, handleDropTaskOntoTask, handleMakeIndependent, showDropError } = useTaskGridUpdateHelper();

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
            header: () => null,
            cell: ({ row, table }) => (
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        className={cn(
                            "transition-opacity duration-100",
                            row.getIsSelected() || table.getIsSomeRowsSelected() ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
                        )}
                    />
                </div>
            ),
            size: 32,
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "status",
            header: () => null,
            size: 32,
            cell: ({ row }) => <TaskOptionPicker task={row.original} field="status" options={statusOptions} onUpdate={handleInlineUpdate} />,
        },
        {
            accessorKey: "id",
            header: () => null,
            size: 60,
            cell: ({ getValue }) => <div className="truncate px-1 font-mono text-[12px] text-muted-foreground/80">#{getValue() as number}</div>,
        },
        {
            accessorKey: "title",
            header: () => null,
            cell: ({ row }) => {
                const task = row.original;
                const isSubtask = !!task.parentTaskId;
                return (
                    <div className={cn("flex min-w-0 items-center gap-1.5 pr-2 text-foreground", isSubtask && "pl-5", task.deletedAt && "line-through text-muted-foreground")}>
                        {isSubtask && <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                        {task.isMilestone && <Diamond className="h-3 w-3 flex-shrink-0 fill-sa-amber text-sa-amber" aria-label="Milestone" />}
                        <span className="truncate">{task.title || "—"}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "priority",
            header: () => null,
            size: 36,
            cell: ({ row }) => <TaskOptionPicker task={row.original} field="priority" options={priorityOptions} onUpdate={handleInlineUpdate} />,
        },
        {
            id: "dateRange",
            header: () => null,
            size: 156,
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

    // Grouping is presentation only: same rows, same order, split by status (#1514)
    const rowGroups = groupByStatus(table.getRowModel().rows, (row) => row.original.status);
    const summaryGroups = groupByStatus(filteredTasks, (task) => task.status);
    const doneCount = filteredTasks.filter((task) => task.status === taskGroupConstants.doneStatus).length;
    const labelOf = (status: string) => statusOptions.find((option) => option.code === status)?.label ?? (status || "No status");
    const toggleGroup = (status: string) => setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
    const selectedCount = Object.keys(taskGridRowSelection).filter((id) => taskGridRowSelection[id]).length;

    return (
        <div ref={taskContainerRef} className="relative flex h-full w-full flex-col bg-background">
            {/* Loading Overlay */}
            {taskGridIsLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Error Overlay */}
            {taskGridError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load tasks</AlertDescription>
                    </Alert>
                </div>
            )}

            <TaskListSummary
                projectName={currentProject?.name ?? ""}
                groups={summaryGroups}
                total={filteredTasks.length}
                doneCount={doneCount}
                labelOf={labelOf}
            />

            <TaskGroupedTable
                table={table}
                groups={rowGroups}
                collapsed={collapsedGroups}
                onToggleGroup={toggleGroup}
                labelOf={labelOf}
                filteredTasks={filteredTasks}
                handleContextMenu={handleContextMenu}
                handleDropTaskOntoTask={handleDropTaskOntoTask}
                handleMakeIndependent={handleMakeIndependent}
                openTaskTab={openTaskTab}
                showDropError={showDropError}
            />

            {/* Make Independent Drop Zone */}
            <MakeIndependentDropZone onDrop={handleMakeIndependent} showError={showDropError} />

            {/* Footer: select all + count */}
            <div className="flex h-9 items-center gap-2 border-t border-sa-border bg-background px-3 text-[12px] text-muted-foreground">
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
                <span>
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                    {selectedCount > 0 && <span className="text-foreground"> · {selectedCount} selected</span>}
                </span>
            </div>
        </div>
    );
}
