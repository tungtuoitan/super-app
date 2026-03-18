/**
 * KanbanColumn - Droppable Column for Kanban Board
 * Small reusable component used by MultiProjectKanbanView.
 */

import React, { useRef } from "react";
import { useDrop, DropTargetMonitor } from "react-dnd";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { getTaskStatusColors } from "@/utils/task/TaskDetail.utils";
import { cn } from "@/lib/utils";
import { KANBAN_TASK } from "../../../utils/project/multiProjectDetail.constants";
import type { DragItem, KanbanColumnProps } from "../../../types/multiProject/multiProjectKanban.type";
import { DraggableTaskCard } from "./MultiProjectKanbanCard";

export function KanbanColumn({ status, tasks, allTasks, showSubtasks, onTaskClick, onDropTask, canDropToColumn }: KanbanColumnProps) {
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
            <div className="flex items-center gap-2 p-3 border-b">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.bg }} />
                <span className="font-medium text-sm">{status.label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{taskCount}</span>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 min-h-[100px]">
                    {displayTasks.length === 0 ? (
                        <div className={cn("text-center text-xs text-muted-foreground py-8", isOver && canDrop && "border-primary text-primary")}></div>
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
