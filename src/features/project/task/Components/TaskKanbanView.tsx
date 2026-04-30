/**
 * TaskKanbanView - Kanban Board Component
 * Displays tasks grouped by status with drag and drop support
 * Uses react-dnd (same as WorkspaceTree and TabBar)
 *
 * Pure UI — logic lives in useTaskKanbanSelector, useTaskKanbanHelper
 */

import React, { useRef, useState } from "react";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { Loader2, CornerDownRight } from "lucide-react";
import { Checkbox } from "@/shared";
import { Label } from "@/shared";
import { Alert, AlertDescription } from "@/shared";
import { ScrollArea } from "@/shared";
import type { Task } from "@/features/taskDetail";
import { useTaskTabHelper } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { useTaskKanbanSelector } from "../Selectors/TaskKanbanSelector";
import { useTaskKanbanHelper } from "../hooks/taskKanban/useTaskKanban.helper";
import { getTaskStatusColorsWithBorder, getTaskPriorityDotColor } from "@/features/taskDetail";
import {usePTaskStore} from "../../store/usePTask.store";

// Drag item type
const KANBAN_TASK = "KANBAN_TASK";

interface DragItem {
    type: string;
    taskId: number;
    status: string;
}

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
    const priorityColors = getTaskPriorityDotColor(task.priority);

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
    const statusColors = getTaskStatusColorsWithBorder(status.code);

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
 * Gets projectId from useProjectDetailStore — NO props.
 */
export function TaskKanbanView() {
    const { taskGridIsLoading, taskGridError } = usePTaskStore();
    const { openTaskTab } = useTaskTabHelper();

    const { statusOptions, filteredTasks, tasksByStatus } = useTaskKanbanSelector();
    const { canDropToColumn, handleDropTask } = useTaskKanbanHelper();

    // Show subtasks toggle (default: on) — UI-local state
    const [showSubtasks, setShowSubtasks] = useState(true);

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
                    {statusOptions.map((status:any) => (
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
