/**
 * Multi-Project Timeline Headless
 * Side-effects only (useEffect). Handles timeline initialization, persistence, scroll, data loading.
 * Calls stores/selectors/helpers directly — no params.
 */

import { useEffect } from "react";
import { useMultiProjectTaskGridHelper } from "../hooks/useMultiProjectTaskGrid.helper";
import { useAuthStore } from "@/store/index";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiTimelineSelector } from "../Selectors/useMultiTimeline.selector";
import { useMultiTimelineHelper } from "../hooks/useMultiTimeline.helper";
import { storageService } from "@/services/storage.service";

export function useMultiTimelineHeadless() {
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { $user } = useAuthStore();

    // Call stores/selectors/helpers directly
    const {
        projectIds, storageKey, mode,
        timelineRange, setTimelineRange,
        dayWidth, hasScrolledToToday, setHasScrolledToToday, timelineScrollRef,
    } = useMultiTimelineStore();
    const { items, todayPosition } = useMultiTimelineSelector();
    const { checkTodayVisibility } = useMultiTimelineHelper();

    // Effect 0: Reset scroll flag on mount so Effect 3 re-scrolls to today
    useEffect(() => {
        setHasScrolledToToday(false);
    }, []);

    // Effect 1: Initialize timeline range from items
    useEffect(() => {
        if (timelineRange) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let minDate = new Date(today);
        let maxDate = new Date(today);

        items.forEach((item) => {
            if (item.startDate) {
                if (item.startDate < minDate) minDate = new Date(item.startDate);
                if (item.startDate > maxDate) maxDate = new Date(item.startDate);
            }
            if (item.endDate) {
                if (item.endDate < minDate) minDate = new Date(item.endDate);
                if (item.endDate > maxDate) maxDate = new Date(item.endDate);
            }
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

    // Effect 2: Persist dayWidth to localStorage
    useEffect(() => {
        storageService.set(storageKey, dayWidth);
    }, [storageKey, dayWidth]);

    // Effect 3: Scroll to today on initial load
    useEffect(() => {
        if (!hasScrolledToToday && timelineScrollRef.current && timelineRange) {
            const clientWidth = timelineScrollRef.current.clientWidth;
            timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday, todayPosition, timelineRange, timelineScrollRef]);

    // Effect 4: Load tasks on mount / filter change (task mode only)
    useEffect(() => {
        if (mode !== "task") return;
        if ($user.userId && projectIds.length > 0) loadTasksForProjects(projectIds);
    }, [mode, $user.userId, projectIds, $user.filters?.taskGrid]);

    // Effect 5: Recheck today visibility on dayWidth change
    useEffect(() => {
        checkTodayVisibility();
    }, [checkTodayVisibility, dayWidth]);
}
