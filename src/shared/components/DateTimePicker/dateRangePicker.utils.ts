/**
 * DateRangePicker pure helpers (#1514 — moved out of DateRangePicker.tsx, unchanged)
 */

import { format, isToday, isTomorrow, isSameWeek, addWeeks, isSameYear, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import type { DateWarningResult } from "./dateRangePicker.type";

/**
 * Check if dates exceed limits
 */
export function checkDateWarning(
    startDate: Date | null | undefined,
    endDate: Date | null | undefined,
    limitStartDate: Date | null | undefined,
    limitEndDate: Date | null | undefined
): DateWarningResult {
    const result: DateWarningResult = {
        hasWarning: false,
        warningMessage: null,
        taskDurationDays: null,
    };

    // Calculate duration
    if (startDate && endDate) {
        result.taskDurationDays = differenceInDays(endDate, startDate) + 1;
    }

    const issues: string[] = [];

    if (limitStartDate && startDate && startDate < limitStartDate) {
        issues.push("starts before limit");
    }
    if (limitEndDate && endDate && endDate > limitEndDate) {
        issues.push("ends after limit");
    }

    if (issues.length > 0) {
        result.hasWarning = true;
        result.warningMessage = `Date ${issues.join(" and ")}`;
    }

    return result;
}

/**
 * Format task duration for display
 */
export function formatTaskDuration(days: number | null): string {
    if (days === null) return "No dates set";
    if (days === 1) return "1 day";
    return `${days} days`;
}

/**
 * Format date to smart relative display (same as DateTimePicker)
 */
export function formatSmartDate(date: Date, hasTime: boolean): string {
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let dateStr = "";

    if (isToday(date)) {
        dateStr = "Today";
    } else if (isTomorrow(date)) {
        dateStr = "Tomorrow";
    } else if (isSameWeek(date, now, { weekStartsOn: 1 })) {
        dateStr = dayNames[date.getDay()];
    } else {
        const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

        if (date >= nextWeekStart && date <= nextWeekEnd) {
            dateStr = `Next ${dayNames[date.getDay()]}`;
        } else if (isSameYear(date, now)) {
            dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
        } else {
            dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }
    }

    if (hasTime) {
        const timeStr = format(date, "H:mm");
        dateStr = `${dateStr}, ${timeStr}`;
    }

    return dateStr;
}
