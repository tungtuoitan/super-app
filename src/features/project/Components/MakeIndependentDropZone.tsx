/**
 * MakeIndependentDropZone - Drop zone for making subtasks independent.
 */

import React, { useRef } from "react";
import { useDrop, DropTargetMonitor } from "react-dnd";
import { ArrowUpFromLine } from "lucide-react";
import type { Task, TaskDragItem } from "@/features/taskDetail";
import { validateMakeIndependent } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { TASK_ROW } from "../task/taskRow.constants";

interface MakeIndependentDropZoneProps {
    onDrop: (task: Task) => void;
    showError: (message: string) => void;
}

export function MakeIndependentDropZone({ onDrop, showError }: MakeIndependentDropZoneProps) {
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

    const isVisible = isDragging && canDrop;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg border-2 border-dashed flex items-center gap-2 transition-all duration-200 z-20",
                !isVisible && "opacity-0 scale-95",
                isVisible && !isOver && "opacity-100 border-muted-foreground/50 bg-muted/80 text-muted-foreground",
                isVisible && isOver && "opacity-100 border-primary bg-primary/20 text-primary scale-105",
            )}
        >
            <ArrowUpFromLine className="h-4 w-4" />
            <span className="text-sm font-medium">Make independent task</span>
        </div>
    );
}
