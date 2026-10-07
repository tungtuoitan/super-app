/**
 * MultiProjectKanbanCard - Draggable Task Card for Kanban Board
 * Pure UI component for a single draggable task card.
 */

import React, { useRef } from "react";
import { useDrag, DragSourceMonitor } from "react-dnd";
import { CornerDownRight, Diamond } from "lucide-react";
import type { Task } from "@/features/taskDetail";
import { TaskPriorityIcon, formatCompactDateRange, getDateTone } from "@/shared";
import { cn } from "@/lib/utils";
import { KANBAN_TASK } from "@/features/multiProject/utils/multiProjectDetail.constants";
import type { DragItem } from "@/features/multiProject/types/multiProjectKanban.type";

interface DraggableTaskCardProps {
    task: Task;
    onClick: () => void;
    isSubtask?: boolean;
}

export function DraggableTaskCard({ task, onClick, isSubtask = false }: DraggableTaskCardProps) {
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
                    <TaskPriorityIcon priority={task.priority} size={12} className="text-muted-foreground" />
                    <span className="font-mono text-[11px] text-muted-foreground">#{task.id}</span>
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
