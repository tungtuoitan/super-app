/**
 * TaskKanbanView - Kanban Board Component
 * Displays tasks grouped by status with drag and drop support
 * Uses react-dnd (same as WorkspaceTree and TabBar)
 */

import React, { useMemo, useCallback, useRef, useState } from "react";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { Loader2, CornerDownRight } from "lucide-react";
import { Checkbox } from "@/Components/ui/checkbox";
import { Label } from "@/Components/ui/label";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { useTaskGridHelper } from "@/hooks/task/useTaskGrid.helper";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { useAuthStore } from "@/store/index";
import { useGeneralStore } from "@/store/general/General.store";
import { taskService } from "@/services/task.service";
import { cn } from "@/lib/utils";
import { constants } from "@/utils/constants";
import { toLocalISOString } from "@/utils/date.utils";

interface TaskKanbanViewProps {
    projectId: number;
}

// Drag item type
const KANBAN_TASK = "KANBAN_TASK";

interface DragItem {
    type: string;
    taskId: number;
    status: string;
}

/**
 * Get task status colors from constants (with border)
 */
const getTaskStatusColors = (status: string) => {
    const colors = constants.optionColor.taskStatus.colors[status];
    const base = colors || constants.optionColor.taskStatus.default;
    return { ...base, border: base.bg };
};

/**
 * Get task priority colors from constants (for dot)
 */
const getTaskPriorityColors = (priority: string) => {
    const colors = constants.optionColor.taskPriority.colors[priority];
    const base = colors || constants.optionColor.taskPriority.default;
    return { dot: base.bg };
};

/**
 * Draggable Task Card
 */
interface DraggableTaskCardProps {
    task: Task;
    onClick: () => void;
    isSubtask?: boolean;
}

function DraggableTaskCard({ task, onClick, isSubtask = false }: DraggableTaskCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const priorityColors = getTaskPriorityColors(task.priority);

    const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
        type: KANBAN_TASK,
        item: { type: KANBAN_TASK, taskId: task.id, status: task.status },
        collect: (monitor: DragSourceMonitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(ref);

    return (
        <div
            ref={ref}
            className={cn(
                "group bg-card border rounded-md cursor-grab hover:border-primary/50 transition-all",
                isDragging && "opacity-50 shadow-lg cursor-grabbing",
                task.deletedAt && "opacity-60",
                isSubtask ? "p-2 opacity-80 ml-3 border-l-2 border-l-muted-foreground/30" : "p-3"
            )}
            onClick={onClick}
        >
            <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-1">
                    {isSubtask && <CornerDownRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    <p className={cn("font-medium text-left truncate", isSubtask ? "text-xs" : "text-sm")}>
                        {task.title || "Untitled"}
                    </p>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1">
                    {/* Priority dot */}
                    <span
                        className={cn("rounded-full flex-shrink-0", isSubtask ? "w-1.5 h-1.5" : "w-2 h-2")}
                        style={{ backgroundColor: priorityColors.dot }}
                        title={task.priority}
                    />

                    {/* Task ID */}
                    <span className={cn("text-muted-foreground", isSubtask ? "text-[10px]" : "text-xs")}>#{task.id}</span>

                    {/* Due date if exists */}
                    {task.endDate && (
                        <span className={cn("text-muted-foreground ml-auto", isSubtask ? "text-[10px]" : "text-xs")}>
                            {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                            }).format(task.endDate)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Droppable Kanban Column
 */
interface KanbanColumnProps {
    status: { code: string; label: string };
    tasks: Task[];
    allTasks: Task[];
    showSubtasks: boolean;
    onTaskClick: (task: Task) => void;
    onDropTask: (taskId: number, newStatus: string) => void;
    canDropToColumn: (taskId: number, targetStatus: string) => boolean;
}

function KanbanColumn({ status, tasks, allTasks, showSubtasks, onTaskClick, onDropTask, canDropToColumn }: KanbanColumnProps) {
    const ref = useRef<HTMLDivElement>(null);
    const statusColors = getTaskStatusColors(status.code);

    const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
        accept: KANBAN_TASK,
        drop: (item: DragItem) => {
            if (item.status !== status.code && canDropToColumn(item.taskId, status.code)) {
                onDropTask(item.taskId, status.code);
            }
        },
        canDrop: (item: DragItem) => item.status !== status.code && canDropToColumn(item.taskId, status.code),
        collect: (monitor: DropTargetMonitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    drop(ref);

    // Filter tasks to show (optionally hide subtasks)
    const displayTasks = showSubtasks ? tasks : tasks.filter((t) => !t.parentTaskId);
    const taskCount = showSubtasks ? tasks.length : tasks.filter((t) => !t.parentTaskId).length;

    return (
        <div
            ref={ref}
            className={cn(
                "flex flex-col min-w-[280px] max-w-[320px] h-full bg-muted/30 rounded-lg transition-colors",
                isOver && canDrop && "bg-primary/10 ring-2 ring-primary/50",
                isOver && !canDrop && "bg-muted/50"
            )}
        >
            {/* Column Header */}
            <div className="flex items-center gap-2 p-3 border-b">
                <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColors.bg }}
                />
                <span className="font-medium text-sm">{status.label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {taskCount}
                </span>
            </div>

            {/* Column Content */}
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 min-h-[100px]">
                    {displayTasks.length === 0 ? (
                        <div className={cn(
                            "text-center text-xs text-muted-foreground py-8",
                            isOver && canDrop && "border-primary text-primary"
                        )}>
                        </div>
                    ) : (
                        displayTasks.map((task) => (
                            <DraggableTaskCard
                                key={task.id}
                                task={task}
                                onClick={() => onTaskClick(task)}
                                isSubtask={!!task.parentTaskId}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

/**
 * TaskKanbanView - Main Kanban Board Component
 */
export function TaskKanbanView({ projectId }: TaskKanbanViewProps) {
    const {
        tasks,
        taskGridIsLoading,
        setTaskGridIsLoading,
        taskGridError,
    } = useTaskStore();

    const { loadTasks } = useTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { $user } = useAuthStore();
    const { registriesByType } = useGeneralStore();

    // Show subtasks toggle (default: on)
    const [showSubtasks, setShowSubtasks] = useState(true);

    // Get status options from registriesByType
    const statusOptions = useMemo(() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses
            .map((reg) => ({
                code: reg.code,
                label: reg.description || reg.code,
            }))
            .sort((a, b) =>
                (constants.optionOrder.taskStatuses[a.label] ?? 999) -
                (constants.optionOrder.taskStatuses[b.label] ?? 999)
            );
    }, [registriesByType]);

    // Filter tasks by projectId
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => task.projectId === projectId && !task.deletedAt);
    }, [tasks, projectId]);

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        statusOptions.forEach((status) => {
            grouped[status.code] = [];
        });
        filteredTasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            } else {
                // If status doesn't exist in options, add to first column
                const firstStatus = statusOptions[0]?.code;
                if (firstStatus && grouped[firstStatus]) {
                    grouped[firstStatus].push(task);
                }
            }
        });
        // Sort tasks within each column by orderIndex
        Object.keys(grouped).forEach((status) => {
            grouped[status].sort((a, b) => a.orderIndex - b.orderIndex);
        });
        return grouped;
    }, [filteredTasks, statusOptions]);

    /**
     * Check if a task can be dropped to a target status column
     * Business rules:
     * - cancelled cannot be dropped to completed
     * - completed cannot be dropped to cancelled/onhold
     * - Task with active subtasks (open/inprogress/onhold) cannot be dropped to completed
     */
    const canDropToColumn = useCallback(
        (taskId: number, targetStatus: string): boolean => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task) return false;

            // cancelled cannot go to completed
            if (task.status === "cancelled" && targetStatus === "completed") return false;

            // completed cannot go to cancelled or onhold
            if (task.status === "completed" && (targetStatus === "cancelled" || targetStatus === "onhold")) return false;

            // Check for active subtasks when moving to completed
            if (targetStatus === "completed") {
                const subtasks = filteredTasks.filter((t) => t.parentTaskId === task.id);
                const hasActiveSubtasks = subtasks.some((s) =>
                    ["open", "inprogress", "onhold"].includes(s.status)
                );
                if (hasActiveSubtasks) return false;
            }

            return true;
        },
        [tasks, filteredTasks]
    );

    /**
     * Handle drop task to new column with cascade status changes for subtasks
     * Cascade rules:
     * - open → onhold: subtasks (open/inprogress) → onhold
     * - * → cancelled: subtasks (open/inprogress/onhold) → cancelled
     * - inprogress → open: subtasks (inprogress) → open
     */
    const handleDropTask = useCallback(
        async (taskId: number, newStatus: string) => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.status === newStatus) return;

            try {
                setTaskGridIsLoading(true);

                // Find subtasks that need cascade update
                const subtasks = filteredTasks.filter((t) => t.parentTaskId === task.id);
                const batchRequests: any[] = [];

                // Add main task update
                batchRequests.push({
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: newStatus,
                    priority: task.priority,
                    startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                });

                // Cascade status changes to subtasks
                subtasks.forEach((subtask) => {
                    let newSubtaskStatus: string | null = null;

                    // open → onhold: subtasks (open/inprogress) → onhold
                    if (newStatus === "onhold" && ["open", "inprogress"].includes(subtask.status)) {
                        newSubtaskStatus = "onhold";
                    }
                    // * → cancelled: subtasks (open/inprogress/onhold) → cancelled
                    else if (newStatus === "cancelled" && ["open", "inprogress", "onhold"].includes(subtask.status)) {
                        newSubtaskStatus = "cancelled";
                    }
                    // inprogress → open: subtasks (inprogress) → open
                    else if (task.status === "inprogress" && newStatus === "open" && subtask.status === "inprogress") {
                        newSubtaskStatus = "open";
                    }

                    if (newSubtaskStatus && newSubtaskStatus !== subtask.status) {
                        batchRequests.push({
                            id: subtask.id,
                            projectId: subtask.projectId,
                            parentTaskId: subtask.parentTaskId,
                            type: subtask.type,
                            title: subtask.title,
                            note: subtask.note,
                            status: newSubtaskStatus,
                            priority: subtask.priority,
                            startDate: toLocalISOString(subtask.startDate),
                            endDate: toLocalISOString(subtask.endDate),
                            orderIndex: subtask.orderIndex,
                        });
                    }
                });

                const result = await taskService._upsertTaskBatch($user.userToken, batchRequests);

                if (result.success) {
                    await loadTasks(projectId);
                }
            } catch (error) {
                console.error("Failed to update task status:", error);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [tasks, filteredTasks, $user.userToken, loadTasks, projectId, setTaskGridIsLoading]
    );

    // Load tasks on mount
    React.useEffect(() => {
        if ($user.userId) {
            loadTasks(projectId);
        }
    }, [$user.userId, projectId]);

    return (
        <div className="w-full h-full flex flex-col relative">
            {/* Loading Overlay */}
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
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

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 h-full">
                    {statusOptions.map((status) => (
                        <KanbanColumn
                            key={status.code}
                            status={status}
                            tasks={tasksByStatus[status.code] || []}
                            allTasks={filteredTasks}
                            showSubtasks={showSubtasks}
                            onTaskClick={openTaskTab}
                            onDropTask={handleDropTask}
                            canDropToColumn={canDropToColumn}
                        />
                    ))}
                </div>
            </div>

            {/* Footer with count and controls */}
            <div className="flex items-center justify-between px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="show-subtasks"
                        checked={showSubtasks}
                        onCheckedChange={(checked) => setShowSubtasks(!!checked)}
                    />
                    <Label htmlFor="show-subtasks" className="text-xs text-muted-foreground cursor-pointer">
                        Show subtasks
                    </Label>
                </div>
            </div>
        </div>
    );
}
