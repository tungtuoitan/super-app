/**
 * TaskKanbanView - Kanban Board Component
 * Displays tasks grouped by status with drag and drop support
 * Uses react-dnd (same as WorkspaceTree and TabBar)
 *
 * Pure UI — logic lives in useTaskKanbanSelector, useTaskKanbanHelper
 */

import React, { useRef, useState } from "react";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { Loader2, CornerDownRight, Diamond } from "lucide-react";
import { Checkbox } from "@/shared";
import { Label } from "@/shared";
import { Alert, AlertDescription } from "@/shared";
import { ScrollArea } from "@/shared";
import type { Task } from "@/features/taskDetail";
import { useTaskTabHelper } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { useTaskKanbanSelector } from "../Selectors/TaskKanbanSelector";
import { useTaskKanbanHelper } from "../hooks/taskKanban/useTaskKanban.helper";
import { TaskStatusIcon, TaskPriorityIcon, formatCompactDateRange, getDateTone } from "@/shared";
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
                "group rounded-xl border border-sa-border bg-card cursor-grab transition-colors duration-100 hover:border-sa-border-strong",
                isDragging && "opacity-50 cursor-grabbing",
                task.deletedAt && "opacity-60",
                isSubtask ? "ml-3 p-2.5" : "p-3"
            )}
            onClick={onClick}
        >
            <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-1">
                    {isSubtask && <CornerDownRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    {task.isMilestone && <Diamond className="h-3 w-3 text-sa-amber fill-sa-amber flex-shrink-0" aria-label="Milestone" />}
                    <p className={cn("text-left truncate text-foreground", isSubtask ? "text-[12px]" : "text-[13px] font-medium")}>
                        {task.title || "Untitled"}
                    </p>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1.5">
                    {/* Priority */}
                    <TaskPriorityIcon priority={task.priority} size={12} className="text-muted-foreground" />

                    {/* Task ID */}
                    <span className="font-mono text-[11px] text-muted-foreground">#{task.id}</span>

                    {/* Dates if any — red when overdue, amber dot when ending today */}
                    {(task.startDate || task.endDate) && (
                        <span className={cn("ml-auto inline-flex items-center gap-1 text-[11px]", getDateTone(task.endDate, task.status) === "overdue" ? "text-sa-danger" : "text-muted-foreground")}>
                            {getDateTone(task.endDate, task.status) === "today" && <span className="h-1.5 w-1.5 rounded-full bg-sa-amber" />}
                            {formatCompactDateRange(task.startDate, task.endDate)}
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
                "flex flex-col min-w-[280px] max-w-[320px] h-full rounded-xl border border-sa-border bg-sa-surface/60 transition-colors duration-100",
                isOver && canDrop && "border-sa-amber/60 bg-sa-amber/5",
                isOver && !canDrop && "bg-sa-hover"
            )}
        >
            {/* Column Header */}
            <div className="flex h-10 items-center gap-2 px-3 border-b border-sa-border">
                <TaskStatusIcon status={status.code} title={status.label} />
                <span className="font-medium text-[13px] text-foreground">{status.label}</span>
                <span className="font-mono text-[12px] text-muted-foreground">{taskCount}</span>
            </div>

            {/* Column Content */}
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 min-h-[100px]">
                    {displayTasks.length === 0 ? (
                        <div className={cn(
                            "text-center text-xs text-muted-foreground py-8",
                            isOver && canDrop && "text-sa-amber-ink"
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
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
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
            <div className="flex-1 overflow-x-auto p-3">
                <div className="flex gap-3 h-full">
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
            <div className="flex h-9 items-center justify-between px-3 bg-background border-t border-sa-border">
                <div className="text-[12px] text-muted-foreground">
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
