/**
 * MultiProjectTaskListCells - Memoized Table Cells for MultiProjectTaskList
 * Contains StatusCell and PriorityCell components.
 */

import React from "react";
import { Task } from "@/features/task/store/useTask.store";
import { StatusAutoComplete, IStatusOption } from "@/shared/components";

/**
 * Memoized Status Cell
 */
export const StatusCell = function StatusCell({
    task,
    statusOptions,
    onUpdate,
}: {
    task: Task;
    statusOptions: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}) {
    const currentValue = statusOptions.find((opt) => opt.code === task.status) || null;

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <StatusAutoComplete
                value={currentValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        onUpdate(task, "status", newValue.code);
                    }
                }}
                options={statusOptions}
                inputProps={{ name: "status" }}
                size="tiny"
                disabled={!!task.deletedAt}
                disableClearable
            />
        </div>
    );
}

/**
 * Memoized Priority Cell
 */
export const PriorityCell = function PriorityCell({
    task,
    priorityOptions,
    onUpdate,
}: {
    task: Task;
    priorityOptions: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}) {
    const currentValue = priorityOptions.find((opt) => opt.code === task.priority) || null;

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <StatusAutoComplete
                value={currentValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        onUpdate(task, "priority", newValue.code);
                    }
                }}
                options={priorityOptions}
                inputProps={{ name: "priority" }}
                size="tiny"
                disabled={!!task.deletedAt}
                disableClearable
            />
        </div>
    );
}
