/**
 * TaskList - Task Grid Component
 * VSCode-style dark theme table for tasks
 * Shows tasks for a specific project
 * Supports inline status/priority editing
 */

import React, { useEffect, useMemo, useCallback } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef, flexRender } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/Components/ui/checkbox";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { useTaskGridHelper } from "@/hooks/task/useTaskGrid.helper";
import { useAuthStore } from "@/store/index";
import { useGeneralStore } from "@/store/general/General.store";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { StatusAutoComplete, IStatusOption, DateTimePicker } from "@/shared/components";
import { taskService } from "@/services/task.service";
import {constants} from "@/utils/constants";

interface TaskListProps {
    projectId: number;
}

/**
 * Get task status colors from constants
 */
const getTaskStatusColors = (status: string) => {
    const colors = constants.optionColor.taskStatus.colors[status];
    return colors || constants.optionColor.taskStatus.default;
};

/**
 * Get task priority colors from constants
 */
const getTaskPriorityColors = (priority: string) => {
    const colors = constants.optionColor.taskPriority.colors[priority];
    return colors || constants.optionColor.taskPriority.default;
};

/**
 * TaskList - task grid with table display
 */
export function TaskList({ projectId }: TaskListProps) {
    const {
        tasks,
        taskGridIsLoading,
        setTaskGridIsLoading,
        taskGridError,
        taskGridSorting,
        setTaskGridSorting,
        taskGridRowSelection,
        setTaskGridRowSelection,
        taskGridColumnFilters,
        setTaskGridColumnFilters,
        taskContainerRef,
        setTaskContainerWidth,
    } = useTaskStore();

    const { loadTasks, openTaskContextMenu } = useTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { $user } = useAuthStore();
    const { registriesByType } = useGeneralStore();

    // Get status options from registriesByType with colors
    const statusOptions: IStatusOption[] = useMemo(() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses.map((reg) => {
            const colors = getTaskStatusColors(reg.code);
            return {
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: colors.bg,
                textColor: colors.text,
            };
        })
        .sort((a, b) => (constants.optionOrder.taskStatuses[a.label] ?? 999) - (constants.optionOrder.taskStatuses[b.label] ?? 999));
    }, [registriesByType]);

    // Get priority options from registriesByType with colors
    const priorityOptions: IStatusOption[] = useMemo(() => {
        const taskPriorities = registriesByType["task_priority"] || [];
        return taskPriorities.map((reg) => {
            const colors = getTaskPriorityColors(reg.code);
            return {
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: colors.bg,
                textColor: colors.text,
            };
        })
        .sort((a, b) => (constants.optionOrder.taskPriorities[a.label] ?? 999) - (constants.optionOrder.taskPriorities[b.label] ?? 999));
    }, [registriesByType]);

    // Handle inline field update
    const handleInlineUpdate = useCallback(
        async (task: Task, field: "status" | "priority", newValue: string) => {
            if (task[field] === newValue) return; // No change

            try {
                setTaskGridIsLoading(true);

                // Prepare upsert data
                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: field === "status" ? newValue : task.status,
                    priority: field === "priority" ? newValue : task.priority,
                    startDate: task.startDate ? task.startDate.toISOString() : null,
                    endDate: task.endDate ? task.endDate.toISOString() : null,
                    orderIndex: task.orderIndex,
                };

                // Call API to update
                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    // Reload tasks to get fresh data
                    await loadTasks(projectId);
                }
            } catch (error) {
                console.error("Failed to update task:", error);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [$user.userToken, loadTasks, projectId, setTaskGridIsLoading]
    );

    // Handle inline date update
    const handleInlineDateUpdate = useCallback(
        async (task: Task, field: "startDate" | "endDate", newValue: Date | null) => {
            // Check if value actually changed
            const currentValue = task[field];
            const isSame = (currentValue === null && newValue === null) ||
                (currentValue && newValue && currentValue.getTime() === newValue.getTime());
            if (isSame) return;

            try {
                setTaskGridIsLoading(true);

                // Prepare upsert data
                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: task.status,
                    priority: task.priority,
                    startDate: field === "startDate"
                        ? (newValue ? newValue.toISOString() : null)
                        : (task.startDate ? task.startDate.toISOString() : null),
                    endDate: field === "endDate"
                        ? (newValue ? newValue.toISOString() : null)
                        : (task.endDate ? task.endDate.toISOString() : null),
                    orderIndex: task.orderIndex,
                };

                // Call API to update
                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    // Reload tasks to get fresh data
                    await loadTasks(projectId);
                }
            } catch (error) {
                console.error("Failed to update task date:", error);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [$user.userToken, loadTasks, projectId, setTaskGridIsLoading]
    );

    // Handle context menu
    const handleContextMenu = (event: React.MouseEvent, row?: any) => {
        openTaskContextMenu(event, row, projectId, (task: Task) => {
            // Open new task in main TabBar
            openTaskTab(task);
        });
    };

    // Define columns for the data table
    const columns = useMemo<ColumnDef<Task>[]>(() => {
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
                cell: ({ getValue }) => (
                    <div className="text-sm text-primary text-left cursor-pointer hover:text-primary/80 px-2 truncate">
                        {(getValue() as string) || "—"}
                    </div>
                ),
            },
            {
                accessorKey: "status",
                header: () => <div className="text-left text-sm">Status</div>,
                size: 140,
                cell: ({ row }) => {
                    const task = row.original;
                    const currentValue = statusOptions.find((opt) => opt.code === task.status) || null;

                    return (
                        <div className="px-1" onClick={(e) => e.stopPropagation()}>
                            <StatusAutoComplete
                                value={currentValue}
                                onChange={(_, newValue) => {
                                    if (newValue) {
                                        handleInlineUpdate(task, "status", newValue.code);
                                    }
                                }}
                                options={statusOptions}
                                inputProps={{ name: "status" }}
                                size="tiny"
                                disabled={!!task.deletedAt}
                                disableClearable
                            />
                        </div>
                    );
                },
            },
            {
                accessorKey: "priority",
                header: () => <div className="text-left text-sm">Priority</div>,
                size: 140,
                cell: ({ row }) => {
                    const task = row.original;
                    const currentValue = priorityOptions.find((opt) => opt.code === task.priority) || null;

                    return (
                        <div className="px-1" onClick={(e) => e.stopPropagation()}>
                            <StatusAutoComplete
                                value={currentValue}
                                onChange={(_, newValue) => {
                                    if (newValue) {
                                        handleInlineUpdate(task, "priority", newValue.code);
                                    }
                                }}
                                options={priorityOptions}
                                inputProps={{ name: "priority" }}
                                size="tiny"
                                disabled={!!task.deletedAt}
                                disableClearable
                            />
                        </div>
                    );
                },
            },
            {
                accessorKey: "startDate",
                header: () => <div className="text-left text-sm">Start Date</div>,
                size: 140,
                cell: ({ row }) => {
                    const task = row.original;
                    return (
                        <div className="px-1" onClick={(e) => e.stopPropagation()}>
                            <DateTimePicker
                                value={task.startDate}
                                onChange={(date) => handleInlineDateUpdate(task, "startDate", date)}
                                placeholder="—"
                                disabled={!!task.deletedAt}
                                showTime={true}
                            />
                        </div>
                    );
                },
            },
            {
                accessorKey: "endDate",
                header: () => <div className="text-left text-sm">End Date</div>,
                size: 140,
                cell: ({ row }) => {
                    const task = row.original;
                    return (
                        <div className="px-1" onClick={(e) => e.stopPropagation()}>
                            <DateTimePicker
                                value={task.endDate}
                                onChange={(date) => handleInlineDateUpdate(task, "endDate", date)}
                                placeholder="—"
                                disabled={!!task.deletedAt}
                                showTime={true}
                            />
                        </div>
                    );
                },
            },
        ];
    }, [statusOptions, priorityOptions, handleInlineUpdate, handleInlineDateUpdate]);

    // Filter tasks by projectId
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => task.projectId === projectId);
    }, [tasks, projectId]);

    // Sort tasks by createdAt descending
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [filteredTasks]);

    // Create table instance (without pagination)
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

    // Update container width on resize
    useEffect(() => {
        if (!taskContainerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setTaskContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(taskContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Load data when user is ready
    useEffect(() => {
        if (!$user.userId) return;
        loadTasks(projectId);
    }, [$user.userId, projectId]);

    return (
        <div ref={taskContainerRef} className="w-full h-full bg-background flex flex-col relative">
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
                                    {/* No tasks found. Right-click to create a new task. k dùng text này, nếu dùng thì khi chuyển đổi tab thì sẽ bị chớp, gây khó chịu*/} 
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    data-row
                                    className={`border-b h-[40px] cursor-pointer hover:bg-muted/50 transition-colors ${
                                        row.original.deletedAt ? "opacity-60" : ""
                                    }`}
                                    onClick={() => openTaskTab(row.original)}
                                    onContextMenu={(e) => {
                                        e.stopPropagation();
                                        handleContextMenu(e, row);
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="text-left">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer with count */}
            <div className="flex items-center px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                </div>
            </div>
        </div>
    );
}
