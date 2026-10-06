/**
 * Multi-Project Timeline Headless
 * Side-effects only (useEffect). Handles timeline initialization, persistence, scroll, data loading.
 * Calls stores/selectors/helpers directly — no params.
 */

import { useEffect } from "react";
import { useMultiProjectTaskGridHelper } from "../mpTaskList/useMultiProjectTaskGrid.helper";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiTimelineSelector } from "../../Selectors/useMultiTimeline.selector";
import { useMultiTimelineHelper } from "./useMultiTimeline.helper";
import { storageService } from "@/shared";
import { resolveTimelineSpan } from "../../utils/multiTimelineSpan.utils";
import { isStatusNonDraggable } from "@/features/taskDetail";
import {useAuthStore} from "@/shared";

/** Minimum span (days) of the project week overview — ~6 months */
const PRO_MIN_RANGE_DAYS = 182;

export function useMultiTimelineHeadless() {
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { $user } = useAuthStore();

    // Call stores/selectors/helpers directly
    const {
        projectIds, storageKey, mode,
        timelineRange, setTimelineRange,
        dayWidth, weekWidth, hasScrolledToToday, setHasScrolledToToday, timelineScrollRef,
    } = useMultiTimelineStore();
    const { items, todayPosition } = useMultiTimelineSelector();
    const { checkTodayVisibility } = useMultiTimelineHelper();

    // Effect 0: Reset scroll flag on mount / mode switch so Effect 3 re-scrolls to today
    // (task and project mode use different scales, so the old scroll position is meaningless)
    useEffect(() => {
        setHasScrolledToToday(false);
    }, [mode]);

    // Effect 1: Initialize timeline range from items
    useEffect(() => {
        if (timelineRange) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let minDate = new Date(today);
        let maxDate = new Date(today);

        items.forEach((item) => {
            const span = resolveTimelineSpan(item, null, isStatusNonDraggable(item.status || ""));
            if (!span) return;
            if (span.start < minDate) minDate = new Date(span.start);
            if (span.end > maxDate) maxDate = new Date(span.end);
        });

        const start = new Date(minDate);
        start.setDate(start.getDate() - 14);
        start.setHours(0, 0, 0, 0);

        const end = new Date(maxDate);
        end.setDate(end.getDate() + 14);
        end.setHours(0, 0, 0, 0);

        const minRange = 60;
        const currentRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (currentRange < minRange) {
            const toAdd = Math.ceil((minRange - currentRange) / 2);
            start.setDate(start.getDate() - toAdd);
            end.setDate(end.getDate() + toAdd);
        }

        setTimelineRange({ start, end });
    }, [items, timelineRange]);

    // Effect 1b: Project mode is a week overview — make sure the range spans enough weeks.
    // Only the end is extended so existing bar positions / scroll offset stay put.
    useEffect(() => {
        if (mode !== "project" || !timelineRange) return;
        const spanDays = Math.ceil((timelineRange.end.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24));
        if (spanDays >= PRO_MIN_RANGE_DAYS) return;
        const end = new Date(timelineRange.start);
        end.setDate(end.getDate() + PRO_MIN_RANGE_DAYS);
        setTimelineRange((prev) => (prev ? { ...prev, end } : null));
    }, [mode, timelineRange]);

    // Effect 2: Persist column width (day width in task mode, week width in project mode) to localStorage
    useEffect(() => {
        storageService.set(storageKey, mode === "project" ? weekWidth : dayWidth);
    }, [storageKey, mode, dayWidth, weekWidth]);

    // Effect 3: Scroll to today on initial load
    useEffect(() => {
        if (!hasScrolledToToday && timelineScrollRef.current && timelineRange) {
            const clientWidth = timelineScrollRef.current.clientWidth;
            timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday, todayPosition, timelineRange, timelineScrollRef]);

    // Effect 4: Load tasks on mount / filter change (task mode only)
    // useEffect(() => {
    //     if (mode !== "task") return;
    //     if ($user.userId && projectIds.length > 0) loadTasksForProjects(projectIds);
    // }, [mode, $user.userId, projectIds, $user.filters?.taskGrid]);

    // Effect 5: Recheck today visibility on zoom change
    useEffect(() => {
        checkTodayVisibility();
    }, [dayWidth, weekWidth]);
}
