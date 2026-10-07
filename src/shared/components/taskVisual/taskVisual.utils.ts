/**
 * Task visual utils (#1514) — pure functions, no React.
 */

import { taskVisualConstants } from "./taskVisual.constants";
import type { DateTone, TaskPriorityVisual, TaskStatusVisual } from "./taskVisual.type";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Palette entry for a task/project status code (falls back to a quiet ring) */
export function getTaskStatusVisual(status: string | null | undefined): TaskStatusVisual {
    return (status && taskVisualConstants.status[status]) || taskVisualConstants.statusDefault;
}

/** Palette entry for a priority code (unknown/empty → 0 bars) */
export function getTaskPriorityVisual(priority: string | null | undefined): TaskPriorityVisual {
    return (priority && taskVisualConstants.priority[priority]) || taskVisualConstants.priorityDefault;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Compact date range — "07–08 Oct", "28 Sep – 03 Oct", "07 Oct".
 * Adds a 2-digit year only when a date is outside the current year.
 */
export function formatCompactDateRange(start: Date | null | undefined, end: Date | null | undefined, now: Date = new Date()): string {
    const yearSuffix = (d: Date) => (d.getFullYear() !== now.getFullYear() ? ` ${String(d.getFullYear()).slice(-2)}` : "");
    const one = (d: Date) => `${pad2(d.getDate())} ${MONTHS[d.getMonth()]}${yearSuffix(d)}`;

    if (start && end) {
        const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
        if (sameMonth && start.getDate() === end.getDate()) return one(end);
        if (sameMonth) return `${pad2(start.getDate())}–${one(end)}`;
        return `${one(start)} – ${one(end)}`;
    }
    if (end) return one(end);
    if (start) return `${one(start)} –`;
    return "";
}

/** "overdue" when end date passed and the task is not finished; "today" when it ends today */
export function getDateTone(end: Date | null | undefined, status: string | null | undefined, now: Date = new Date()): DateTone {
    if (!end) return "normal";
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (endDay === today) return "today";
    const isDone = !!status && taskVisualConstants.doneStatuses.includes(status);
    if (endDay < today && !isDone) return "overdue";
    return "normal";
}
