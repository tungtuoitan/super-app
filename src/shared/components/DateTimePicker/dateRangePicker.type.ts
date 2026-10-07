/**
 * DateRangePicker types (#1514 — moved out of DateRangePicker.tsx, unchanged)
 */

/**
 * Date warning result for limit checking
 */
export interface DateWarningResult {
    hasWarning: boolean;
    warningMessage: string | null;
    taskDurationDays: number | null;
}

export type SelectionMode = "start" | "end";
