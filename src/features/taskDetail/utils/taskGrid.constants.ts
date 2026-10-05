export const TIMELINE_ROW_HEIGHT = 36;
export const TIMELINE_HEADER_HEIGHT = 60;
export const TIMELINE_TASK_BAR_HEIGHT = 28;
export const TIMELINE_SUBTASK_BAR_HEIGHT = 20;
export const TIMELINE_MIN_BAR_WIDTH = 20;
export const TIMELINE_EXTEND_DAYS = 14;
export const TIMELINE_ZOOM_STEP = 10;

/** Statuses offered in the timeline right-click menu (quick status change), in display order */
export const TIMELINE_QUICK_STATUSES = ["open", "in_progress", "paused", "completed", "cancelled"];

/** Weekend stripe pattern (45 degree diagonal lines) */
export const WEEKEND_STRIPE_BG = `repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    hsl(var(--muted-foreground) / 0.15) 3px,
    hsl(var(--muted-foreground) / 0.15) 6px
)`;
