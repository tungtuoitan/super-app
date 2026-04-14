/**
 * Task Grid Types
 * Shared types for task grid / view drag-and-drop operations.
 */

import { Task } from "../types/task.types";

/** Validation result for drag & drop operations */
export interface DropValidation {
    canDrop: boolean;
    errorMessage?: string;
    warningMessage?: string;
}

/** Drag item for task rows (TaskGrid / MultiProjectTaskList) */
export interface TaskDragItem {
    type: string;
    taskId: number;
    task: Task;
}
