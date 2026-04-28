/**
 * Task List Cells - Memoized Table Cells shared by project and multiProject task lists.
 * Contains StatusCell and PriorityCell components.
 */

import React from "react";
import type { Task } from "@/features/taskDetail";
import { StatusAutoComplete, IStatusOption } from "@/shared/components";

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
