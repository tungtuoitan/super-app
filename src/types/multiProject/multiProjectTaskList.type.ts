/**
 * MultiProject Task List Type Definitions
 */

import { Row } from "@tanstack/react-table";
import { Task } from "@/store/task/useTask.store";

export interface DraggableRowProps {
    row: Row<Task>;
    allTasks: Task[];
    onDrop: (dragTask: Task, dropTask: Task, warningMessage?: string) => void;
    onMakeIndependent: (task: Task) => void;
    onRowClick: (task: Task) => void;
    onContextMenu: (e: React.MouseEvent, row: Row<Task>) => void;
    showError: (message: string) => void;
}
