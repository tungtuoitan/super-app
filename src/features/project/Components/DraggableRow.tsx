/**
 * Task List Row - Draggable Table Row for the single-project TaskGrid.
 * Drop A onto B = nest A as subtask of B (no reorder in this view).
 */

import React, { useRef } from "react";
import { Row, flexRender } from "@tanstack/react-table";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import type { Task, TaskDragItem } from "@/features/taskDetail";
import { validateDropTaskOntoTask } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { TASK_ROW } from "@/features/taskDetail";

interface DraggableRowProps {
    row: Row<Task>;
    allTasks: Task[];
    onDrop: (dragTask: Task, dropTask: Task, warningMessage?: string) => void;
    onMakeIndependent: (task: Task) => void;
    onRowClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, row: Row<Task>) => void;
    showError: (message: string) => void;
}


export function DraggableRow({ row, allTasks, onDrop, onRowClick, onContextMenu, showError }: DraggableRowProps) {
    const ref = useRef<HTMLTableRowElement>(null);
    const task = row.original;

    const [{ isDragging }, drag] = useDrag<TaskDragItem, void, { isDragging: boolean }>({
        type: TASK_ROW,
        item: { type: TASK_ROW, taskId: task.id, task },
        collect: (monitor: DragSourceMonitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [{ isOver, canDrop }, drop] = useDrop<TaskDragItem, void, { isOver: boolean; canDrop: boolean }>({
        accept: TASK_ROW,
        drop: (item: TaskDragItem) => {
            const validation = validateDropTaskOntoTask(item.task, task, allTasks);
            if (validation.canDrop) {
                onDrop(item.task, task, validation.warningMessage);
            } else if (validation.errorMessage) {
                showError(validation.errorMessage);
            }
        },
        canDrop: (item: TaskDragItem) => {
            const validation = validateDropTaskOntoTask(item.task, task, allTasks);
            return validation.canDrop;
        },
        collect: (monitor: DropTargetMonitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    drag(drop(ref));

    return (
        <tr
            ref={ref}
            data-row
            className={cn(
                "group/row h-9 cursor-grab border-b border-sa-border/60 transition-colors duration-100",
                task.deletedAt && "opacity-60",
                isDragging && "opacity-50 cursor-grabbing",
                isOver && canDrop && "bg-sa-amber/10 outline outline-1 outline-dashed outline-sa-amber -outline-offset-1",
                isOver && !canDrop && "bg-sa-danger/10",
                !isDragging && !isOver && (row.getIsSelected() ? "bg-sa-hover-strong" : "hover:bg-sa-hover"),
            )}
            onClick={() => onRowClick(task)}
            onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, row);
            }}
        >
            {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="text-left overflow-hidden" style={{ width: cell.column.id === "title" ? undefined : cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
            ))}
        </tr>
    );
}
