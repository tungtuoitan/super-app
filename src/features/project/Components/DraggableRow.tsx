/**
 * Task List Row - Draggable Table Row & Date Cell shared by project and multiProject task lists.
 * Default drop = reorder (before/after based on hover position).
 * Hold Shift while dropping = nest dragged task as subtask of drop target.
 */

import React, { useEffect, useRef, useState } from "react";
import { Row, flexRender } from "@tanstack/react-table";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import type { Task, TaskDragItem } from "@/features/taskDetail";
import {
    validateDropTaskOntoTask,
    validateReorderTask,
    ensureDragModifierListeners,
    getIsShiftHeld,
} from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { TASK_ROW } from "@/features/taskDetail";

interface DraggableRowProps {
    row: Row<Task>;
    allTasks: Task[];
    onDrop: (dragTask: Task, dropTask: Task, warningMessage?: string) => void;
    onMakeIndependent: (task: Task) => void;
    onReorder: (dragTask: Task, dropTask: Task, position: "before" | "after") => void;
    onRowClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, row: Row<Task>) => void;
    showError: (message: string) => void;
}

type HoverState = { mode: "reorder-before" | "reorder-after" | "nest"; canDrop: boolean } | null;

function getHoverPosition(ref: React.RefObject<HTMLTableRowElement>, monitor: DropTargetMonitor): "before" | "after" {
    const rect = ref.current?.getBoundingClientRect();
    const offset = monitor.getClientOffset();
    if (!rect || !offset) return "after";
    const middleY = rect.top + rect.height / 2;
    return offset.y < middleY ? "before" : "after";
}

export function DraggableRow({ row, allTasks, onDrop, onReorder, onRowClick, onContextMenu, showError }: DraggableRowProps) {
    const ref = useRef<HTMLTableRowElement>(null);
    const task = row.original;
    const isSubtask = !!task.parentTaskId;
    const [hover, setHover] = useState<HoverState>(null);

    useEffect(() => {
        ensureDragModifierListeners();
    }, []);

    const [{ isDragging }, drag] = useDrag<TaskDragItem, void, { isDragging: boolean }>({
        type: TASK_ROW,
        item: { type: TASK_ROW, taskId: task.id, task },
        collect: (monitor: DragSourceMonitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [{ isOver }, drop] = useDrop<TaskDragItem, void, { isOver: boolean }>({
        accept: TASK_ROW,
        hover: (item, monitor) => {
            if (!monitor.isOver({ shallow: true })) return;
            if (item.taskId === task.id) {
                setHover(null);
                return;
            }
            if (getIsShiftHeld()) {
                const validation = validateDropTaskOntoTask(item.task, task, allTasks);
                setHover({ mode: "nest", canDrop: validation.canDrop });
            } else {
                const position = getHoverPosition(ref, monitor);
                const validation = validateReorderTask(item.task, task);
                setHover({
                    mode: position === "before" ? "reorder-before" : "reorder-after",
                    canDrop: validation.canDrop,
                });
            }
        },
        drop: (item, monitor) => {
            if (item.taskId === task.id) return;
            if (getIsShiftHeld()) {
                const validation = validateDropTaskOntoTask(item.task, task, allTasks);
                if (validation.canDrop) {
                    onDrop(item.task, task, validation.warningMessage);
                } else if (validation.errorMessage) {
                    showError(validation.errorMessage);
                }
                return;
            }
            const validation = validateReorderTask(item.task, task);
            if (!validation.canDrop) {
                if (validation.errorMessage) showError(validation.errorMessage);
                return;
            }
            const position = getHoverPosition(ref, monitor);
            onReorder(item.task, task, position);
        },
        collect: (monitor: DropTargetMonitor) => ({
            isOver: monitor.isOver({ shallow: true }),
        }),
    });

    useEffect(() => {
        if (!isOver) setHover(null);
    }, [isOver]);

    drag(drop(ref));

    const showTopIndicator = isOver && hover?.mode === "reorder-before" && hover.canDrop;
    const showBottomIndicator = isOver && hover?.mode === "reorder-after" && hover.canDrop;
    const nestActive = isOver && hover?.mode === "nest" && hover.canDrop;
    const dropInvalid = isOver && hover && !hover.canDrop;

    return (
        <tr
            ref={ref}
            data-row
            className={cn(
                "border-b h-[40px] cursor-grab transition-colors relative",
                task.deletedAt && "opacity-60",
                isSubtask && "bg-muted/20",
                isDragging && "opacity-50 cursor-grabbing",
                nestActive && "bg-primary/20 ring-2 ring-primary/50",
                dropInvalid && "bg-destructive/10",
                showTopIndicator && "shadow-[inset_0_2px_0_0_var(--primary)]",
                showBottomIndicator && "shadow-[inset_0_-2px_0_0_var(--primary)]",
                !isDragging && !isOver && "hover:bg-muted/50",
            )}
            onClick={() => onRowClick(task)}
            onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, row);
            }}
        >
            {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="text-left overflow-hidden" style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
            ))}
        </tr>
    );
}
