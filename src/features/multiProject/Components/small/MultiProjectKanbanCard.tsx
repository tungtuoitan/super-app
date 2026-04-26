/**
 * MultiProjectKanbanCard - Draggable Task Card for Kanban Board
 * Pure UI component for a single draggable task card.
 */

import React, { useRef } from "react";
import { useDrag, DragSourceMonitor } from "react-dnd";
import { CornerDownRight } from "lucide-react";
import type { Task } from "@/features/taskDetail";
import { getTaskPriorityColors } from "@/features/taskDetail";
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
                isSubtask ? "p-2 opacity-80 ml-8 border-l-2 border-l-muted-foreground/30" : "p-3"
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
                    <span
                        className={cn("rounded-full flex-shrink-0", isSubtask ? "w-1.5 h-1.5" : "w-2 h-2")}
                        style={{ backgroundColor: priorityColors.bg }}
                        title={task.priority}
                    />
                    <span className={cn("text-muted-foreground", isSubtask ? "text-[10px]" : "text-xs")}>#{task.id}</span>
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
