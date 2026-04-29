/**
 * Task List Row - Draggable Table Row & Date Cell shared by project and multiProject task lists.
 * Contains DateRangeCell and DraggableRow components.
 */

import React, { useRef } from "react";
import { Row, flexRender } from "@tanstack/react-table";
import type { Task, TaskDragItem } from "@/features/taskDetail";
import { DateRangePicker } from "@/shared";

interface DraggableRowProps {
    row: Row<Task>;
    allTasks: Task[];
    onDrop: (dragTask: Task, dropTask: Task, warningMessage?: string) => void;
    onMakeIndependent: (task: Task) => void;
    onRowClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, row: Row<Task>) => void;
    showError: (message: string) => void;
}

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
