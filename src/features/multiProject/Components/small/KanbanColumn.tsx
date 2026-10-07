/**
 * KanbanColumn - Droppable Column for Kanban Board
 * Small reusable component used by MultiProjectKanbanView.
 */

import React, { useRef } from "react";
import { useDrop, DropTargetMonitor } from "react-dnd";
import { ScrollArea } from "@/shared";
import { TaskStatusIcon } from "@/shared";
import { cn } from "@/lib/utils";
import { KANBAN_TASK } from "@/features/multiProject/utils/multiProjectDetail.constants";
import type { DragItem, KanbanColumnProps } from "@/features/multiProject/types/multiProjectKanban.type";
import { DraggableTaskCard } from "./MultiProjectKanbanCard";

export function KanbanColumn({ status, tasks, allTasks, showSubtasks, onTaskClick, onDropTask, canDropToColumn }: KanbanColumnProps) {
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
            <div className="flex h-10 items-center gap-2 px-3 border-b border-sa-border">
                <TaskStatusIcon status={status.code} title={status.label} />
                <span className="font-medium text-[13px] text-foreground">{status.label}</span>
                <span className="font-mono text-[12px] text-muted-foreground">{taskCount}</span>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 min-h-[100px]">
                    {displayTasks.length === 0 ? (
                        <div className={cn("text-center text-xs text-muted-foreground py-8", isOver && canDrop && "text-sa-amber-ink")}></div>
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
