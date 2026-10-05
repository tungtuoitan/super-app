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
import type { HomeStatusView, PrivacyView } from "../types/home.types";

/**
 * Everything the home UI renders (TungRoot #1481). In private mode every sensitive part is a
 * placeholder with no values — the data is not even in memory — so nothing can be read or guessed.
 */
export const useHomeSelector = () => {
    const {
        activity, publicHabits, sensitiveHabits, finance,
        privacyMode, fullUntil, fullDurationMinutes, nowMs,
        todayKey, isLoading, isUnlocking, error, loadedAt,
    } = useHomeStore();

    const weeks = useMemo(() => buildWeekKeys(todayKey, homeConstants.activityWeeks), [todayKey]);

    const activityView = useMemo(
        () => buildActivityView(activity, homeConstants.activityGroups, homeConstants.otherGroup, weeks),
        [activity, weeks],
    );

    const slots = useMemo(
        () => buildTrackerSlots(
            publicHabits,
            privacyMode === "full" ? sensitiveHabits : null,
            homeConstants.publicTrackerIds,
            homeConstants.trackers,
            homeConstants.defaultTracker,
            countMaskedTrackers(homeConstants.trackers, homeConstants.publicTrackerIds),
            homeConstants.maskedTrackerLabel,
        ),
        [publicHabits, sensitiveHabits, privacyMode],
    );

    const kpis = useMemo(() => buildKpis(slots, todayKey), [slots, todayKey]);
    const dayColumns = useMemo(() => buildDayColumns(todayKey, homeConstants.dayGridDays), [todayKey]);
    const dayRows = useMemo(() => buildDayRows(slots, dayColumns, todayKey), [slots, dayColumns, todayKey]);
    const weekBars = useMemo(() => buildWeekBars(slots, weeks, todayKey), [slots, weeks, todayKey]);
    const timelineMarks = useMemo(() => (privacyMode === "full" ? buildTimelineMarks(slots) : []), [slots, privacyMode]);
    const financeView = useMemo(
        () => (privacyMode === "full" && finance ? buildFinanceView(finance) : MASKED_FINANCE),
        [finance, privacyMode],
    );

    const privacy: PrivacyView = {
        mode: privacyMode,
        remainingSeconds: privacyMode === "full" ? remainingSeconds(fullUntil, nowMs) : 0,
        fullDurationMinutes,
        durationOptions: homeConstants.fullModeOptions,
        isUnlocking,
    };

    const status: HomeStatusView = { isLoading, error, loadedAt, todayKey };

    return { activityView, kpis, dayColumns, dayRows, weekBars, timelineMarks, financeView, privacy, status };
};
