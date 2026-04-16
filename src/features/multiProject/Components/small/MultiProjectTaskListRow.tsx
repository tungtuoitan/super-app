/**
 * MultiProjectTaskListRow - Draggable Table Row & Date Cell for MultiProjectTaskList
 * Contains DateRangeCell and DraggableRow components.
 */

import React, { useRef } from "react";
import { Row, flexRender } from "@tanstack/react-table";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { Task } from "@/features/task/store/useTask.store";
import { DateRangePicker } from "@/shared/components";
import { cn } from "@/lib/utils";
import { validateDropTaskOntoTask } from "@/features/task/utils/TaskGrid.utils";
import type { TaskDragItem } from "@/features/task/types/taskGrid.types";
import { TASK_ROW } from "@/features/multiProject/utils/multiProjectDetail.constants";
import type { DraggableRowProps } from "@/features/multiProject/types/multiProjectTaskList.type";

/**
 * Memoized Date Range Cell with optional limit dates
 */
export const DateRangeCell = React.memo(function DateRangeCell({
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
});

/**
 * Draggable & Droppable Table Row for Multi-Project view
 */
export function DraggableRow({ row, allTasks, onDrop, onMakeIndependent, onRowClick, onContextMenu, showError }: DraggableRowProps) {
    const ref = useRef<HTMLTableRowElement>(null);
    const task = row.original;
    const isSubtask = !!task.parentTaskId;

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
                "border-b h-[40px] cursor-grab transition-colors",
                task.deletedAt && "opacity-60",
                isSubtask && "bg-muted/20",
                isDragging && "opacity-50 cursor-grabbing",
                isOver && canDrop && "bg-primary/20 ring-2 ring-primary/50",
                isOver && !canDrop && "bg-destructive/10",
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
