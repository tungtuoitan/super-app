/**
 * Task list grouping constants (#1514) — Linear-style list grouped by status.
 */

export const taskGroupConstants = {
    /** Display order of status groups; statuses not listed go last in their natural order */
    order: ["in_progress", "background_progress", "open", "on_hold", "paused", "completed", "failed", "cancelled"] as readonly string[],
    /** Groups collapsed when the list first renders */
    collapsedByDefault: ["completed", "failed", "cancelled"] as readonly string[],
    /** Status counted as done for the progress bar */
    doneStatus: "completed",
} as const;
