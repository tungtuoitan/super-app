/**
 * MultiProject Task List Type Definitions
 */

import type React from "react";
import { Row } from "@tanstack/react-table";
import type { Task } from "@/features/taskDetail";

export interface DraggableRowProps {
    row: Row<Task>;
    /** Latest task list, read lazily on drag/drop so rows can be memoized without going stale */
    allTasksRef: React.MutableRefObject<Task[]>;
    /** Passed explicitly (row.getIsSelected() reads live table state, so memo could not see the change) */
    isSelected: boolean;
    /** Identity changes when anything the cells render from (status/priority/project options) changes */
    cellDeps: unknown;
    onDrop: (dragTask: Task, dropTask: Task, warningMessage?: string) => void;
    onMakeIndependent: (task: Task) => void;
    onReorder: (dragTask: Task, dropTask: Task, position: "before" | "after") => void;
    onRowClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, row: Row<Task>) => void;
    showError: (message: string) => void;
}
