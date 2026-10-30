import type { TimelineScale } from "../types/taskTimelineScale.type";

export const TIMELINE_SCALE_STORAGE_KEY = "multi_timeline_scale"
export const TASK_TIMELINE_SCALE_STORAGE_KEY = "task_timeline_scale";
export const DEFAULT_TIMELINE_SCALE: TimelineScale = "day";

/** Fixed px-per-day for coarse scales ("day" uses the zoomable dayWidth) */
export const TIMELINE_SCALE_PX_PER_DAY: Record<Exclude<TimelineScale, "day">, number> = {
    week: 14,
    month: 4,
    quarter: 1.3,
    year: 0.35,
};

export const TIMELINE_SCALE_OPTIONS: { value: TimelineScale; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "year", label: "Year" },
];
