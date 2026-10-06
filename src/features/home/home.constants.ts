/**
 * Home (progress dashboard) constants — TungRoot #1481.
 *
 * Privacy: this repo is public, so nothing here names a sensitive tracker. Trackers are referenced by
 * task id only; their titles come from the API, and sensitive ones are fetched only in full mode.
 * PUBLIC_TRACKER_IDS is an allowlist — every other repeat task is treated as sensitive (new trackers
 * stay hidden until someone adds them here on purpose).
 */

import type { ActivityGroupConfig, HomeView, TrackerConfig } from "./types/home.types";

export const homeConstants = {
    moduleId: "Home",
    color: "#7F77DD",

    /** Weeks shown on the activity streamgraph and the weekly tracker bars (incl. current week) */
    activityWeeks: 30,
    /** Day grid: previous week + current week */
    dayGridDays: 14,
    /** Months of finance history fetched in full mode */
    financeMonths: 24,

    refreshIntervalMs: 60 * 60 * 1000,
    dayCheckIntervalMs: 60 * 1000,
    /** Reload when the window regains focus and data is older than this */
    staleAfterMs: 10 * 60 * 1000,

    /** Full mode lasts this long, then the page returns to private by itself */
    fullModeDefaultMinutes: 5,
    fullModeOptions: [2, 5, 15] as const,
    countdownTickMs: 1000,

    /** Label for a masked tracker in private mode (followed by its index) */
    maskedTrackerLabel: "Riêng tư",

    /** Bot check-in tracker (#1486): its answers feed the Tâm lý view, not the habit rows. Full mode only. */
    psychTrackerId: 1486,
    /** Weeks shown for weekly psych questions */
    psychWeeks: 12,
    /** A psych question needs this many answers before averages are shown */
    psychMinAnswers: 3,

    /** Tabs, in keyboard order (keys 1–6) */
    views: [
        { key: "overview", label: "Tổng quan" },
        { key: "act", label: "Hoạt động" },
        { key: "hab", label: "Thói quen" },
        { key: "day", label: "14 ngày" },
        { key: "psy", label: "Tâm lý" },
        { key: "fin", label: "Tài chính" },
    ] as { key: HomeView; label: string }[],
    /** Below this size the page is zoomed out to fit (Claude Design v5 layout) */
    rootId: "home-root",
    fitWidth: 1280,
    fitHeight: 820,

    /** Tracker task ids that may be shown in private mode */
    publicTrackerIds: [1458, 1459, 1460] as number[],

    /** Per-tracker settings; trackers not listed default to `defaultTracker` */
    trackers: {
        1458: { kind: "daily", weeklyTarget: 7 },
        1459: { kind: "daily", weeklyTarget: 7 },
        1460: { kind: "count", weeklyTarget: 5 },
        1461: { kind: "limit", weeklyLimit: 2, weekendOnly: true },
        1462: { kind: "event" },
    } as Record<number, TrackerConfig>,
    defaultTracker: { kind: "count" } as TrackerConfig,

    /** Activity groups for the streamgraph (project ids → group); unknown projects go to `otherGroup` */
    activityGroups: [
        { key: "work", label: "Công ty", projectIds: [4, 32] },
        { key: "infra", label: "Hạ tầng", projectIds: [23, 34, 35, 36, 37, 38, 39] },
        { key: "superapp", label: "SuperApp", projectIds: [3, 5, 6, 10, 11, 12] },
        { key: "learn", label: "Học", projectIds: [14, 17, 18, 27, 28, 30, 31, 40] },
        { key: "finance", label: "Tài chính", projectIds: [20, 25] },
        { key: "life", label: "Sức khoẻ & sống", projectIds: [1, 2, 8, 15, 16, 19, 21, 22, 24] },
        { key: "misc", label: "Việc vặt", projectIds: [7, 9, 13, 26, 29, 33] },
    ] as ActivityGroupConfig[],
    otherGroup: { key: "other", label: "Khác" },
} as const;
