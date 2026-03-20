/**
 * LifeLog Constants
 */

import type { TrackColor, DateRangeOption } from "@/types/lifeLog.types";

// ─── Track colors ────────────────────────────────────────────────────────────

export const TRACK_COLORS: TrackColor[] = [
    { name: "Red",     hex: "#ef4444" },
    { name: "Orange",  hex: "#f97316" },
    { name: "Amber",   hex: "#f59e0b" },
    { name: "Pink",    hex: "#ec4899" },
    { name: "Violet",  hex: "#8b5cf6" },
    { name: "Sky",     hex: "#0ea5e9" },
    { name: "Emerald", hex: "#10b981" },
];

// ─── Graph constants ─────────────────────────────────────────────────────────

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
    { label: "7 days",   days: 7   },
    { label: "14 days",  days: 14  },
    { label: "30 days",  days: 30  },
    { label: "90 days",  days: 90  },
    { label: "All time", days: null },
];

export const ZOOM_STEPS = [7, 14, 30, 60, 90, 180, 365];

// ─── Interaction constants ───────────────────────────────────────────────────

export const LONG_PRESS_MS = 500;

// ─── Image processing ────────────────────────────────────────────────────────

export const ICON_TARGET_SIZE = 32;
export const ICON_MAX_BYTES = 100 * 1024;
