/**
 * MultiProjectTaskList - Task Grid Component for Multiple Projects
 * Shows tasks from multiple selected projects
 * Similar to TaskList but with projectIds array support
 * Supports drag & drop for subtask management (same project only)
 */

import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, ColumnDef, flexRender, Row } from "@tanstack/react-table";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { Loader2, CornerDownRight, ArrowUpFromLine } from "lucide-react";
import { Checkbox } from "@/Components/ui/checkbox";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { Project } from "@/store/project/useProject.store";
import { useMultiProjectTaskGridHelper } from "@/hooks/project/useMultiProjectTaskGrid.helper";
import { useAuthStore } from "@/store/index";
import { useGeneralStore } from "@/store/general/General.store";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { StatusAutoComplete, IStatusOption, DateTimePicker } from "@/shared/components";
import { taskService } from "@/services/task.service";
import { constants } from "@/utils/constants";
import { toLocalISOString } from "@/utils/date.utils";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { cn } from "@/lib/utils";

// Drag item types
const TASK_ROW = "TASK_ROW";

interface TaskDragItem {
    type: string;
    taskId: number;
    task: Task;
}

/**
 * Validation result for drag & drop operations
 */
interface DropValidation {
    canDrop: boolean;
    errorMessage?: string;
    warningMessage?: string;
}

/**
 * Check if task dates fall outside parent task dates
 */
const checkDateOutsideRange = (dragTask: Task, dropTask: Task): string | null => {
    if (!dropTask.startDate && !dropTask.endDate) {
        return null; // No range to check
    }

    const issues: string[] = [];
    if (dropTask.startDate && dragTask.startDate && dragTask.startDate < dropTask.startDate) {
        issues.push("start date is before parent's start date");
    }
    if (dropTask.endDate && dragTask.endDate && dragTask.endDate > dropTask.endDate) {
        issues.push("end date is after parent's end date");
    }

    if (issues.length > 0) {
        return `Task ${issues.join(" and ")}. Please adjust dates manually.`;
    }
    return null;
};

/**
 * Validate if a task can be dropped onto another task to become a subtask
 */
const validateDropTaskOntoTask = (dragTask: Task, dropTask: Task, allTasks: Task[]): DropValidation => {
    // Rule 1: Cannot drop onto itself
    if (dragTask.id === dropTask.id) {
        return { canDrop: false };
    }

    // Rule 2: Drop target status must be open, inprogress, or onhold
    if (["completed", "cancelled"].includes(dropTask.status)) {
        return { canDrop: false, errorMessage: `Cannot drop onto a ${dropTask.status} task` };
    }

    // Rule 3: Drop target must not be a subtask (depth = 1 constraint)
    if (dropTask.parentTaskId) {
        return { canDrop: false, errorMessage: "Cannot create subtask of a subtask (depth = 1)" };
    }

    // Rule 4: Drag task must not have subtasks (task with subtasks cannot become a subtask)
    const hasSubtasks = allTasks.some((t) => t.parentTaskId === dragTask.id);
    if (hasSubtasks) {
        return { canDrop: false, errorMessage: "Task with subtasks cannot become a subtask" };
    }

    // Rule 5: Cannot drop onto own subtask (circular reference)
    if (dropTask.parentTaskId === dragTask.id) {
        return { canDrop: false, errorMessage: "Cannot drop parent onto its own subtask" };
    }

    // Rule 6: Same project check (critical for multi-project view)
    if (dragTask.projectId !== dropTask.projectId) {
        return { canDrop: false, errorMessage: "Cannot move task to different project" };
    }

    // Check for date warning (allow drop but warn user)
    const dateWarning = checkDateOutsideRange(dragTask, dropTask);

    return { canDrop: true, warningMessage: dateWarning || undefined };
};

/**
 * Validate if a subtask can be made independent
 */
const validateMakeIndependent = (task: Task): DropValidation => {
    if (!task.parentTaskId) {
        return { canDrop: false };
    }
    return { canDrop: true };
};

interface MultiProjectTaskListProps {
    projectIds: number[];
    projects: Project[];
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
 * Memoized Status Cell
 */
const StatusCell = React.memo(function StatusCell({
    task,
    statusOptions,
    onUpdate,
}: {
    task: Task;
    statusOptions: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}) {
    const currentValue = statusOptions.find((opt) => opt.code === task.status) || null;

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <StatusAutoComplete
                value={currentValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        onUpdate(task, "status", newValue.code);
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
});

/**
 * Memoized Priority Cell
 */
const PriorityCell = React.memo(function PriorityCell({
    task,
    priorityOptions,
    onUpdate,
}: {
    task: Task;
    priorityOptions: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}) {
    const currentValue = priorityOptions.find((opt) => opt.code === task.priority) || null;

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <StatusAutoComplete
                value={currentValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        onUpdate(task, "priority", newValue.code);
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
});

/**
 * Memoized Date Cell with date constraints
 * - For subtasks: constrained by parent task dates
 * - For tasks: constrained by project dates
 */
const DateCell = React.memo(function DateCell({
    task,
    field,
    onUpdate,
    minDate,
    maxDate,
    disabledReason,
}: {
    task: Task;
    field: "startDate" | "endDate";
    onUpdate: (task: Task, field: "startDate" | "endDate", value: Date | null) => void;
    minDate?: Date | null;
    maxDate?: Date | null;
    disabledReason?: string;
}) {
    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <DateTimePicker
                value={task[field]}
                onChange={(date) => onUpdate(task, field, date)}
                placeholder="—"
                disabled={!!task.deletedAt || !!disabledReason}
                showTime={true}
                minDate={minDate}
                maxDate={maxDate}
                disabledReason={disabledReason}
            />
        </div>
    );
});

/**
 * Draggable & Droppable Table Row for Multi-Project view
 */
interface DraggableRowProps {
    row: Row<Task>;
    allTasks: Task[];
    onDrop: (dragTask: Task, dropTask: Task, warningMessage?: string) => void;
    onMakeIndependent: (task: Task) => void;
    onRowClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, row: Row<Task>) => void;
    showError: (message: string) => void;
}

function DraggableRow({ row, allTasks, onDrop, onMakeIndependent, onRowClick, onContextMenu, showError }: DraggableRowProps) {
    const ref = useRef<HTMLTableRowElement>(null);
    const task = row.original;
    const isSubtask = !!task.parentTaskId;

    // Drag source
    const [{ isDragging }, drag] = useDrag<TaskDragItem, void, { isDragging: boolean }>({
        type: TASK_ROW,
        item: { type: TASK_ROW, taskId: task.id, task },
        collect: (monitor: DragSourceMonitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Drop target
    const [{ isOver, canDrop }, drop] = useDrop<TaskDragItem, void, { isOver: boolean; canDrop: boolean }>({
        accept: TASK_ROW,
        drop: (item: TaskDragItem) => {
            const validation = validateDropTaskOntoTask(item.task, task, allTasks);
            if (validation.canDrop) {
                onDrop(item.task, task, validation.warningMessage);
            } else if (validation.errorMessage) {
                showError(validation.errorMessage);
            }
        },
        canDrop: (item: TaskDragItem) => {
            const validation = validateDropTaskOntoTask(item.task, task, allTasks);
            return validation.canDrop;
        },
        collect: (monitor: DropTargetMonitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    // Combine drag and drop refs
    drag(drop(ref));

    return (
        <tr
            ref={ref}
            data-row
            className={cn(
                "border-b h-[40px] cursor-grab transition-colors",
                task.deletedAt && "opacity-60",
                isSubtask && "bg-muted/20",
                isDragging && "opacity-50 cursor-grabbing",
                isOver && canDrop && "bg-primary/20 ring-2 ring-primary/50",
                isOver && !canDrop && "bg-destructive/10",
                !isDragging && !isOver && "hover:bg-muted/50"
            )}
            onClick={() => onRowClick(task)}
            onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, row);
            }}
        >
            {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="text-left">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
            ))}
        </tr>
    );
}

/**
 * Drop zone for making subtasks independent
 * Always rendered in DOM but visually hidden until a subtask is being dragged
 */
interface MakeIndependentDropZoneProps {
    onDrop: (task: Task) => void;
    showError: (message: string) => void;
}

function MakeIndependentDropZone({ onDrop, showError }: MakeIndependentDropZoneProps) {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isOver, canDrop, isDragging }, drop] = useDrop<TaskDragItem, void, { isOver: boolean; canDrop: boolean; isDragging: boolean }>({
        accept: TASK_ROW,
        drop: (item: TaskDragItem) => {
            const validation = validateMakeIndependent(item.task);
            if (validation.canDrop) {
                onDrop(item.task);
            } else if (validation.errorMessage) {
                showError(validation.errorMessage);
            }
        },
        canDrop: (item: TaskDragItem) => {
            const validation = validateMakeIndependent(item.task);
            return validation.canDrop;
        },
        collect: (monitor: DropTargetMonitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
            isDragging: monitor.getItem() !== null,
        }),
    });

    drop(ref);

    // Determine if drop zone should be visible (only when dragging a subtask)
    const isVisible = isDragging && canDrop;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg border-2 border-dashed flex items-center gap-2 transition-all duration-200 z-20",
                // Hidden state - still in DOM for drop target, but invisible
                !isVisible && "opacity-0 scale-95",
                // Visible states
                isVisible && !isOver && "opacity-100 border-muted-foreground/50 bg-muted/80 text-muted-foreground",
                isVisible && isOver && "opacity-100 border-primary bg-primary/20 text-primary scale-105"
            )}
        >
            <ArrowUpFromLine className="h-4 w-4" />
            <span className="text-sm font-medium">Make independent task</span>
        </div>
    );
}

/**
 * MultiProjectTaskList - task grid with table display for multiple projects
 */
export function MultiProjectTaskList({ projectIds, projects }: MultiProjectTaskListProps) {
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

    const { loadTasksForProjects, openMultiProjectTaskContextMenu } = useMultiProjectTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { $user } = useAuthStore();
    const { registriesByType } = useGeneralStore();
    const _console = useConsoleHelper();

    // Create a map of projectId -> projectName for display
    const projectNameMap = useMemo(() => {
        const map: Record<number, string> = {};
        projects.forEach((p) => {
            map[p.id] = p.name;
        });
        return map;
    }, [projects]);

    // Get status options from registriesByType with colors
    const statusOptions: IStatusOption[] = useMemo(() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses
            .map((reg) => {
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
        return taskPriorities
            .map((reg) => {
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
            if (task[field] === newValue) return;

            try {
                setTaskGridIsLoading(true);

                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: field === "status" ? newValue : task.status,
                    priority: field === "priority" ? newValue : task.priority,
                    startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                };

                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    await loadTasksForProjects(projectIds);
                }
            } catch (error) {
                console.error("Failed to update task:", error);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [$user.userToken, loadTasksForProjects, projectIds, setTaskGridIsLoading]
    );

    /**
     * Check if any subtasks fall outside the parent task's date range
     * Returns list of subtask titles that are outside the range
     */
    const getSubtasksOutsideRange = useCallback(
        (task: Task, newStartDate: Date | null, newEndDate: Date | null): string[] => {
            const subtasks = tasks.filter((t) => t.parentTaskId === task.id);
            const outsideSubtasks: string[] = [];

            subtasks.forEach((subtask) => {
                let isOutside = false;
                if (newStartDate && subtask.startDate && subtask.startDate < newStartDate) {
                    isOutside = true;
                }
                if (newEndDate && subtask.endDate && subtask.endDate > newEndDate) {
                    isOutside = true;
                }
                if (isOutside) {
                    outsideSubtasks.push(subtask.title || `Subtask #${subtask.id}`);
                }
            });

            return outsideSubtasks;
        },
        [tasks]
    );

    // Handle inline date update
    const handleInlineDateUpdate = useCallback(
        async (task: Task, field: "startDate" | "endDate", newValue: Date | null) => {
            const currentValue = task[field];
            const isSame =
                (currentValue === null && newValue === null) ||
                (currentValue && newValue && currentValue.getTime() === newValue.getTime());
            if (isSame) return;

            // Check if this is a parent task and if any subtasks will fall outside the new range
            if (!task.parentTaskId) {
                const newStartDate = field === "startDate" ? newValue : (task.startDate ?? null);
                const newEndDate = field === "endDate" ? newValue : (task.endDate ?? null);
                const outsideSubtasks = getSubtasksOutsideRange(task, newStartDate, newEndDate);

                if (outsideSubtasks.length > 0) {
                    _console.warning(
                        `Warning: ${outsideSubtasks.length} subtask(s) fall outside the new date range: ${outsideSubtasks.join(", ")}. Please update them manually.`
                    );
                }
            }

            try {
                setTaskGridIsLoading(true);

                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: task.status,
                    priority: task.priority,
                    startDate: field === "startDate" ? toLocalISOString(newValue) : toLocalISOString(task.startDate),
                    endDate: field === "endDate" ? toLocalISOString(newValue) : toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                };

                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    await loadTasksForProjects(projectIds);
                }
            } catch (error) {
                console.error("Failed to update task date:", error);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [$user.userToken, loadTasksForProjects, projectIds, setTaskGridIsLoading, getSubtasksOutsideRange, _console]
    );

    // Handle context menu
    const handleContextMenu = (event: React.MouseEvent, row?: any) => {
        openMultiProjectTaskContextMenu(event, row, projectIds, (task: Task) => {
            openTaskTab(task);
        });
    };

    /**
     * Handle drop task onto another task (make subtask)
     */
    const handleDropTaskOntoTask = useCallback(
        async (dragTask: Task, dropTask: Task, warningMessage?: string) => {
            try {
                setTaskGridIsLoading(true);

                // Update task to become a subtask of dropTask
                const upsertData = {
                    id: dragTask.id,
                    projectId: dragTask.projectId,
                    parentTaskId: dropTask.id, // Set new parent
                    type: dragTask.type,
                    title: dragTask.title,
                    note: dragTask.note,
                    status: dragTask.status,
                    priority: dragTask.priority,
                    startDate: toLocalISOString(dragTask.startDate),
                    endDate: toLocalISOString(dragTask.endDate),
                    orderIndex: dragTask.orderIndex,
                };

                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    _console.success(`Task "${dragTask.title || "Untitled"}" is now a subtask of "${dropTask.title || "Untitled"}"`);
                    // Show warning if dates are outside parent range
                    if (warningMessage) {
                        _console.warning(warningMessage);
                    }
                    await loadTasksForProjects(projectIds);
                }
            } catch (error) {
                console.error("Failed to update task parent:", error);
                _console.error("Failed to make task a subtask");
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [$user.userToken, loadTasksForProjects, projectIds, setTaskGridIsLoading, _console]
    );

    /**
     * Handle making a subtask independent (remove parent)
     */
    const handleMakeIndependent = useCallback(
        async (task: Task) => {
            try {
                setTaskGridIsLoading(true);

                // Update task to remove parent
                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: null, // Remove parent
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: task.status,
                    priority: task.priority,
                    startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                };

                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    _console.success(`Task "${task.title || "Untitled"}" is now an independent task`);
                    await loadTasksForProjects(projectIds);
                }
            } catch (error) {
                console.error("Failed to make task independent:", error);
                _console.error("Failed to make task independent");
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [$user.userToken, loadTasksForProjects, projectIds, setTaskGridIsLoading, _console]
    );

    /**
     * Show error message
     */
    const showDropError = useCallback(
        (message: string) => {
            _console.error(message);
        },
        [_console]
    );

    /**
     * Get date constraints for a task
     * - Subtask: constrained by parent task dates
     * - Task: constrained by project dates only (warning shown if subtasks fall outside)
     */
    const getDateConstraints = useCallback(
        (task: Task, field: "startDate" | "endDate"): { minDate?: Date | null; maxDate?: Date | null; disabledReason?: string } => {
            // If task is a subtask, constrain by parent task dates
            if (task.parentTaskId) {
                const parentTask = tasks.find((t) => t.id === task.parentTaskId);
                if (parentTask) {
                    // If parent task has no dates, disable subtask dates
                    if (!parentTask.startDate && !parentTask.endDate) {
                        return {
                            disabledReason: "Parent task has no dates set",
                        };
                    }
                    return {
                        minDate: parentTask.startDate,
                        maxDate: parentTask.endDate,
                    };
                }
            }

            // For regular tasks (parent tasks), only constrain by project dates
            // Subtask overflow will trigger a warning instead of hard constraint
            const project = projects.find((p) => p.id === task.projectId);
            return {
                minDate: project?.startDate || null,
                maxDate: project?.endDate || null,
            };
        },
        [tasks, projects]
    );

    // Define columns for the data table - includes Project column
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
                accessorKey: "projectId",
                header: () => <div className="text-left text-sm">Project</div>,
                size: 150,
                cell: ({ getValue }) => {
                    const projectId = getValue() as number;
                    const projectName = projectNameMap[projectId] || `Project ${projectId}`;
                    return (
                        <div className="text-sm text-muted-foreground text-left px-2 truncate" title={projectName}>
                            {projectName}
                        </div>
                    );
                },
            },
            {
                accessorKey: "title",
                header: () => <div className="text-left text-sm">Title</div>,
                size: 250,
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
                accessorKey: "startDate",
                header: () => <div className="text-left text-sm">Start Date</div>,
                size: 140,
                cell: ({ row }) => {
                    const constraints = getDateConstraints(row.original, "startDate");
                    return (
                        <DateCell
                            task={row.original}
                            field="startDate"
                            onUpdate={handleInlineDateUpdate}
                            minDate={constraints.minDate}
                            maxDate={constraints.maxDate}
                            disabledReason={constraints.disabledReason}
                        />
                    );
                },
            },
            {
                accessorKey: "endDate",
                header: () => <div className="text-left text-sm">End Date</div>,
                size: 140,
                cell: ({ row }) => {
                    const constraints = getDateConstraints(row.original, "endDate");
                    return (
                        <DateCell
                            task={row.original}
                            field="endDate"
                            onUpdate={handleInlineDateUpdate}
                            minDate={constraints.minDate}
                            maxDate={constraints.maxDate}
                            disabledReason={constraints.disabledReason}
                        />
                    );
                },
            },
        ];
    }, [statusOptions, priorityOptions, handleInlineUpdate, handleInlineDateUpdate, projectNameMap, getDateConstraints]);

    // Filter tasks by projectIds
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => projectIds.includes(task.projectId));
    }, [tasks, projectIds]);

    // Sort tasks: parent tasks first (by startDate or createdAt), then subtasks immediately after their parent
    const sortedTasks = useMemo(() => {
        // Separate parent tasks and subtasks
        const parentTasks = filteredTasks.filter((t) => !t.parentTaskId);
        const subtasks = filteredTasks.filter((t) => t.parentTaskId);

        // Sort parent tasks by startDate (null last), then by createdAt
        parentTasks.sort((a, b) => {
            if (a.startDate && b.startDate) {
                return a.startDate.getTime() - b.startDate.getTime();
            }
            if (a.startDate) return -1;
            if (b.startDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Build result with subtasks after their parents
        const result: Task[] = [];
        parentTasks.forEach((parent) => {
            result.push(parent);
            // Find and add subtasks for this parent, sorted by startDate
            const childTasks = subtasks
                .filter((s) => s.parentTaskId === parent.id)
                .sort((a, b) => {
                    if (a.startDate && b.startDate) {
                        return a.startDate.getTime() - b.startDate.getTime();
                    }
                    if (a.startDate) return -1;
                    if (b.startDate) return 1;
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                });
            result.push(...childTasks);
        });

        // Add any orphaned subtasks at the end
        const usedSubtaskIds = new Set(result.filter((t) => t.parentTaskId).map((t) => t.id));
        const orphanedSubtasks = subtasks.filter((s) => !usedSubtaskIds.has(s.id));
        result.push(...orphanedSubtasks);

        return result;
    }, [filteredTasks]);

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
        if (!$user.userId || projectIds.length === 0) return;
        loadTasksForProjects(projectIds);
    }, [$user.userId, projectIds]);

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

            {/* Make Independent Drop Zone - shows when dragging a subtask */}
            <MakeIndependentDropZone onDrop={handleMakeIndependent} showError={showDropError} />

            {/* Footer with count */}
            <div className="flex items-center px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} from {projects.length} project
                    {projects.length !== 1 ? "s" : ""}
                </div>
            </div>
        </div>
    );
}
