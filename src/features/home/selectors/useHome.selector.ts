import { useMemo } from "react";
import { homeConstants } from "../home.constants";
import { useHomeStore } from "../store/useHome.store";
import {
    MASKED_FINANCE,
    buildActivityView,
    buildDayColumns,
    buildDayRows,
    buildFinanceView,
    buildKpis,
    buildTimelineMarks,
    buildTrackerSlots,
    buildWeekBars,
    buildWeekKeys,
    countMaskedTrackers,
    remainingSeconds,
} from "../utils/home.utils";
import { MASKED_PSYCH, buildPsychView, parsePsychBank } from "../utils/homePsych.utils";
import type { HomeStatusView, PrivacyView } from "../types/home.types";

/**
 * Everything the home UI renders (TungRoot #1481). In private mode every sensitive part is a
 * placeholder with no values — the data is not even in memory — so nothing can be read or guessed.
 */
export const useHomeSelector = () => {
    const {
        activity, publicHabits, sensitiveHabits, finance, psychDescription,
        privacyMode, fullUntil, fullDurationMinutes, nowMs,
        todayKey, isLoading, isUnlocking, error, loadedAt, view,
    } = useHomeStore();
    const isFull = privacyMode === "full";

    const weeks = useMemo(() => buildWeekKeys(todayKey, homeConstants.activityWeeks), [todayKey]);

    const activityView = useMemo(
        () => buildActivityView(activity, homeConstants.activityGroups, homeConstants.otherGroup, weeks),
        [activity, weeks],
    );

    // The psych tracker feeds the Tâm lý view only; event trackers only become timeline marks.
    const habitSeries = useMemo(
        () => (isFull ? (sensitiveHabits ?? []).filter((s) => s.taskId !== homeConstants.psychTrackerId) : null),
        [sensitiveHabits, isFull],
    );
    const slots = useMemo(
        () => buildTrackerSlots(
            publicHabits,
            habitSeries,
            homeConstants.publicTrackerIds,
            homeConstants.trackers,
            homeConstants.defaultTracker,
            countMaskedTrackers(homeConstants.trackers, homeConstants.publicTrackerIds),
            homeConstants.maskedTrackerLabel,
        ),
        [publicHabits, habitSeries],
    );
    const rowSlots = useMemo(() => slots.filter((s) => s.config?.kind !== "event"), [slots]);

    const kpis = useMemo(() => buildKpis(rowSlots, todayKey), [rowSlots, todayKey]);
    const dayColumns = useMemo(() => buildDayColumns(todayKey, homeConstants.dayGridDays), [todayKey]);
    const dayRows = useMemo(() => buildDayRows(rowSlots, dayColumns, todayKey), [rowSlots, dayColumns, todayKey]);
    const weekBars = useMemo(() => buildWeekBars(rowSlots, weeks, todayKey), [rowSlots, weeks, todayKey]);
    const timelineMarks = useMemo(() => (isFull ? buildTimelineMarks(slots) : []), [slots, isFull]);
    const financeView = useMemo(() => (isFull && finance ? buildFinanceView(finance) : MASKED_FINANCE), [finance, isFull]);

    const psychView = useMemo(() => {
        if (!isFull) return MASKED_PSYCH;
        const series = (sensitiveHabits ?? []).find((s) => s.taskId === homeConstants.psychTrackerId) ?? null;
        const psychWeeks = buildWeekKeys(todayKey, homeConstants.psychWeeks);
        return buildPsychView(series, parsePsychBank(psychDescription), dayColumns.map((c) => c.date), psychWeeks, todayKey);
    }, [isFull, sensitiveHabits, psychDescription, dayColumns, todayKey]);

    const privacy: PrivacyView = {
        mode: privacyMode,
        remainingSeconds: isFull ? remainingSeconds(fullUntil, nowMs) : 0,
        fullDurationMinutes,
        durationOptions: homeConstants.fullModeOptions,
        isUnlocking,
    };

    const status: HomeStatusView = { isLoading, error, loadedAt, todayKey };

    return { activityView, kpis, dayColumns, dayRows, weekBars, timelineMarks, financeView, psychView, privacy, status, view };
};
