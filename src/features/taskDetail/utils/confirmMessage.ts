/**
 * Task Confirmation Messages
 * Delete confirmation dialogs for tasks
 */

import { type ConfirmMessage, type DeleteType } from "@/shared";

export type TaskEntityType = "task";

export interface TaskConfirmMessageParams {
    type: DeleteType;
    count: number;
    isMultiple: boolean;
}

export const getTaskConfirmMessage = (params: TaskConfirmMessageParams): ConfirmMessage => {
    const { type, count, isMultiple } = params;

    if (type === "soft-delete") {
        return isMultiple
            ? { title: `Delete ${count} tasks?`, subtitle: `Are you sure you want to delete ${count} selected tasks?` }
            : { title: "Delete this task?", subtitle: "This task will be moved to trash." };
    } else {
        return isMultiple
            ? { title: `⚠️ Permanently delete ${count} tasks?`, subtitle: `This action CANNOT be undone. All ${count} tasks will be LOST FOREVER.` }
            : { title: "⚠️ Permanently delete this task?", subtitle: "This action CANNOT be undone. The task will be LOST FOREVER." };
    }
};
