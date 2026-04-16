/**
 * MultiProject Kanban Type Definitions
 */

import { Task } from "@/features/task/store/useTask.store";

export interface DragItem {
    type: string;
    taskId: number;
    status: string;
}

export interface KanbanColumnProps {
    status: { code: string; label: string };
    tasks: Task[];
    allTasks: Task[];
    showSubtasks: boolean;
    onTaskClick: (task: Task) => void;
    onDropTask: (taskId: number, newStatus: string) => void;
    canDropToColumn: (taskId: number, targetStatus: string) => boolean;
}
