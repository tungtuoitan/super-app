/**
 * Task Grid Utilities
 * Pure functions â€” no hooks, no React.
 * Shared validation, sorting, color helpers, and timeline utilities for task grid views.
 */

import {DropValidation} from "../types/taskGrid.types";
import {Task} from "../types/task.types";
import {projectConstants} from "@/features/project/project.constants";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Timeline Constants
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TIMELINE_ROW_HEIGHT = 36;
export const TIMELINE_HEADER_HEIGHT = 60;
export const TIMELINE_TASK_BAR_HEIGHT = 28;
export const TIMELINE_SUBTASK_BAR_HEIGHT = 20;
export const TIMELINE_MIN_BAR_WIDTH = 20;
export const TIMELINE_EXTEND_DAYS = 14;
export const TIMELINE_ZOOM_STEP = 10;

/** Weekend stripe pattern (45 degree diagonal lines) */
export const WEEKEND_STRIPE_BG = `repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    hsl(var(--muted-foreground) / 0.15) 3px,
    hsl(var(--muted-foreground) / 0.15) 6px
)`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Timeline Utility Functions
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Format month for timeline header â€” "Oct 2025" */
export function formatMonthHeader(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
    }).format(date);
}

/** Generate array of dates between start and end (inclusive) */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/** Format date for day header â€” "Mo 20", "Tu 21" */
export function formatDateHeader(date: Date): string {
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const dayOfWeek = dayNames[date.getDay()];
    const dayOfMonth = date.getDate();
    return `${dayOfWeek} ${dayOfMonth}`;
}

/** Check if date is weekend (Saturday or Sunday) */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/** Check if date is today */
export function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

/** Check if date is first day of month */
export function isFirstDayOfMonth(date: Date): boolean {
    return date.getDate() === 1;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TaskBar Color/Status Utilities
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Get task bar colors from constants.timelineTask based on status */
export function getTaskBarColors(status: string) {
    const colors = projectConstants.optionColor.timelineTask.colors[status];
    return colors || projectConstants.optionColor.timelineTask.default;
}

/** Check if task status is non-draggable (dropped, completed, cancelled) */
export function isStatusNonDraggable(status: string): boolean {
    return ["dropped", "completed", "cancelled", "failed"].includes(status);
}

/** Get task status colors with border (for kanban column header) */
export function getTaskStatusColorsWithBorder(status: string) {
    const colors = projectConstants.optionColor.taskStatus.colors[status];
    const base = colors || projectConstants.optionColor.taskStatus.default;
    return { ...base, border: base.bg };
}

/** Get task priority colors (for kanban priority dot) */
export function getTaskPriorityDotColor(priority: string) {
    const colors = projectConstants.optionColor.taskPriority.colors[priority];
    const base = colors || projectConstants.optionColor.taskPriority.default;
    return { dot: base.bg };
}

/**
 * Check if task dates fall outside parent task dates.
 * Returns a warning message or null.
 */
export function checkDateOutsideRange(dragTask: Task, dropTask: Task): string | null {
    if (!dropTask.startDate && !dropTask.endDate) {
        return null; // No range to check
    }

    const issues: string[] = [];
    if (dropTask.startDate && dragTask.startDate && dragTask.startDate < dropTask.startDate) {
        issues.push("start date is before parent's start date");
    }
    if (dropTask.endDate && dragTask.endDate && dragTask.endDate > dropTask.endDate) {
        issues.push("end date is after parent's end date");
    }

    if (issues.length > 0) {
        return `Task ${issues.join(" and ")}. Please adjust dates manually.`;
    }
    return null;
}

/**
 * Validate if a task can be dropped onto another task to become a subtask.
 */
export function validateDropTaskOntoTask(dragTask: Task, dropTask: Task, allTasks: Task[]): DropValidation {
    // Rule 1: Cannot drop onto itself
    if (dragTask.id === dropTask.id) {
        return { canDrop: false };
    }

    // Rule 2: Drop target status must be open, inprogress, or onhold
    if (["completed", "cancelled", "failed"].includes(dropTask.status)) {
        return { canDrop: false, errorMessage: `Cannot drop onto a ${dropTask.status} task` };
    }

    // Rule 3: Drop target must not be a subtask (depth = 1 constraint)
    if (dropTask.parentTaskId) {
        return { canDrop: false, errorMessage: "Cannot create subtask of a subtask (depth = 1)" };
    }

    // Rule 4: Drag task must not have subtasks (task with subtasks cannot become a subtask)
    const hasSubtasks = allTasks.some((t) => t.parentTaskId === dragTask.id);
    if (hasSubtasks) {
        return { canDrop: false, errorMessage: "Task with subtasks cannot become a subtask" };
    }

    // Rule 5: Cannot drop onto own subtask (circular reference)
    if (dropTask.parentTaskId === dragTask.id) {
        return { canDrop: false, errorMessage: "Cannot drop parent onto its own subtask" };
    }

    // Rule 6: Same project check
    if (dragTask.projectId !== dropTask.projectId) {
        return { canDrop: false, errorMessage: "Cannot move task to different project" };
    }

    // Check for date warning (allow drop but warn user)
    const dateWarning = checkDateOutsideRange(dragTask, dropTask);

    return { canDrop: true, warningMessage: dateWarning || undefined };
}

/**
 * Validate if a subtask can be made independent.
 */
export function validateMakeIndependent(task: Task): DropValidation {
    if (!task.parentTaskId) {
        return { canDrop: false };
    }
    return { canDrop: true };
}

/**
 * Sort tasks hierarchically: parent tasks first (by startDate), then subtasks immediately after their parent.
 * Orphaned subtasks (parent not in list) are appended at the end.
 */
export function sortTasksHierarchically(tasks: Task[]): Task[] {
    // Separate parent tasks and subtasks
    const parentTasks = tasks.filter((t) => !t.parentTaskId);
    const subtasks = tasks.filter((t) => t.parentTaskId);

    // Sort parent tasks by startDate (null last), then by createdAt
    parentTasks.sort((a, b) => {
        if (a.startDate && b.startDate) {
            return a.startDate.getTime() - b.startDate.getTime();
        }
        if (a.startDate) return -1;
        if (b.startDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Build result with subtasks after their parents
    const result: Task[] = [];
    parentTasks.forEach((parent) => {
        result.push(parent);
        // Find and add subtasks for this parent, sorted by startDate
        const childTasks = subtasks
            .filter((s) => s.parentTaskId === parent.id)
            .sort((a, b) => {
                if (a.startDate && b.startDate) {
                    return a.startDate.getTime() - b.startDate.getTime();
                }
                if (a.startDate) return -1;
                if (b.startDate) return 1;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
        result.push(...childTasks);
    });

    // Add any orphaned subtasks (parent not in current filter) at the end
    const usedSubtaskIds = new Set(result.filter((t) => t.parentTaskId).map((t) => t.id));
    const orphanedSubtasks = subtasks.filter((s) => !usedSubtaskIds.has(s.id));
    result.push(...orphanedSubtasks);

    return result;
}

/**
 * Check if any subtasks fall outside the parent task's date range.
 * Returns list of subtask titles that are outside the range.
 */
export function getSubtasksOutsideRange(
    task: Task,
    newStartDate: Date | null,
    newEndDate: Date | null,
    allTasks: Task[],
): string[] {
    const subtasks = allTasks.filter((t) => t.parentTaskId === task.id);
    const outsideSubtasks: string[] = [];

    subtasks.forEach((subtask) => {
        let isOutside = false;
        if (newStartDate && subtask.startDate && subtask.startDate < newStartDate) {
            isOutside = true;
        }
        if (newEndDate && subtask.endDate && subtask.endDate > newEndDate) {
            isOutside = true;
        }
        if (isOutside) {
            outsideSubtasks.push(subtask.title || `Subtask #${subtask.id}`);
        }
    });

    return outsideSubtasks;
}


