/**
 * MultiProjectTaskListRow - Draggable Table Row & Date Cell for MultiProjectTaskList
 * Default drop = reorder. Hold Shift = nest as subtask.
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
import { DateRangePicker } from "@/shared";
import { cn } from "@/lib/utils";
import { TASK_ROW } from "@/features/taskDetail";
import type { DraggableRowProps } from "@/features/multiProject/types/multiProjectTaskList.type";

/**
 * Memoized Date Range Cell with optional limit dates
 */
export const DateRangeCell = function DateRangeCell({
    task,
    onStartDateUpdate,
    onEndDateUpdate,
}: {
    task: Task;
    onStartDateUpdate: (task: Task, field: "startDate", value: Date | null) => void;
    onEndDateUpdate: (task: Task, field: "endDate", value: Date | null) => void;
}) {
    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <DateRangePicker
                startDate={task.startDate}
                endDate={task.endDate}
                onStartDateChange={(date: Date | null) => onStartDateUpdate(task, "startDate", date)}
                onEndDateChange={(date) => onEndDateUpdate(task, "endDate", date)}
                placeholder="—"
                disabled={!!task.deletedAt}
                showTime={false}
                limitStartDate={task.parentTaskId ? task.parentStartDate : task.projectStartDate}
                limitEndDate={task.parentTaskId ? task.parentEndDate : task.projectEndDate}
            />
        </div>
    );
}

type HoverState = { mode: "reorder-before" | "reorder-after" | "nest"; canDrop: boolean } | null;

function getHoverPosition(ref: React.RefObject<HTMLTableRowElement>, monitor: DropTargetMonitor): "before" | "after" {
    const rect = ref.current?.getBoundingClientRect();
    const offset = monitor.getClientOffset();
    if (!rect || !offset) return "after";
    const middleY = rect.top + rect.height / 2;
    return offset.y < middleY ? "before" : "after";
}

/**
 * Draggable & Droppable Table Row for Multi-Project view
 */
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
                "group/row border-b border-sa-border/60 h-9 cursor-grab transition-colors duration-100 relative",
                task.deletedAt && "opacity-60",
                isDragging && "opacity-50 cursor-grabbing",
                // Nest (Shift): amber tint + dashed outline — "containment"
                nestActive && "bg-sa-amber/10 outline outline-1 outline-dashed outline-sa-amber -outline-offset-1",
                dropInvalid && "bg-sa-danger/10",
                // Reorder: thin amber line on top/bottom edge — "insertion point"
                showTopIndicator && "shadow-[inset_0_2px_0_0_hsl(var(--sa-accent-amber))]",
                showBottomIndicator && "shadow-[inset_0_-2px_0_0_hsl(var(--sa-accent-amber))]",
                !isDragging && !isOver && (row.getIsSelected() ? "bg-sa-hover-strong" : "hover:bg-sa-hover"),
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
