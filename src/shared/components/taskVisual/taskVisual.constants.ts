/**
 * Task visual palette (#1514) — single source for status/priority colors.
 * Values follow the Home dashboard palette: amber is the only accent,
 * green = done, red = failed/behind, greys for everything quiet.
 * Hex on purpose: some consumers append alpha (`${color}30`).
 */

import type { TaskPriorityVisual, TaskStatusVisual } from "./taskVisual.type";

const GREY = "#8a8a90";
const GREY_DIM = "#6e6e74";
const GREY_LIGHT = "#a6a6ab";
const AMBER = "#f2b54b";
const AMBER_MUTED = "#c9a464";
const GOOD = "#4ade80";
const DANGER = "#f87171";
const INK_DARK = "#0c0c0d";
const INK_LIGHT = "#ededed";

export const taskVisualConstants = {
    status: {
        open: { color: GREY, ink: INK_DARK, shape: "ring" },
        in_progress: { color: AMBER, ink: INK_DARK, shape: "half" },
        background_progress: { color: AMBER_MUTED, ink: INK_DARK, shape: "dot" },
        paused: { color: GREY, ink: INK_DARK, shape: "dashed" },
        on_hold: { color: GREY, ink: INK_DARK, shape: "dashed" },
        completed: { color: GOOD, ink: INK_DARK, shape: "check" },
        cancelled: { color: GREY_DIM, ink: INK_LIGHT, shape: "cross" },
        failed: { color: DANGER, ink: INK_DARK, shape: "cross" },
        // project status — same glyph as cancelled
        dropped: { color: GREY_DIM, ink: INK_LIGHT, shape: "cross" },
    } as Record<string, TaskStatusVisual>,
    statusDefault: { color: GREY_DIM, ink: INK_LIGHT, shape: "ring" } as TaskStatusVisual,
    priority: {
        low: { color: GREY_DIM, ink: INK_LIGHT, level: 1 },
        medium: { color: GREY_LIGHT, ink: INK_DARK, level: 2 },
        high: { color: AMBER, ink: INK_DARK, level: 3 },
        urgent: { color: DANGER, ink: INK_DARK, level: 3 },
    } as Record<string, TaskPriorityVisual>,
    priorityDefault: { color: GREY_DIM, ink: INK_LIGHT, level: 0 } as TaskPriorityVisual,
    /** Statuses considered finished (no overdue warning on their dates) */
    doneStatuses: ["completed", "cancelled", "failed", "dropped"] as readonly string[],
} as const;
