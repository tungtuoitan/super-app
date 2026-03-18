/**
 * Task Timeline Headless
 * Side-effects only (useEffect). Handles timeline initialization, persistence, scroll.
 * Task loading is handled by ProjectDetailHeadless at the parent level.
 * Gets projectId from useProjectDetailStore — NO params.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskTimelineStore, STORAGE_KEY_ZOOM } from "@/store/task/useTaskTimeline.store";
import { useTaskTimelineSelector } from "@/Selectors/task/TaskTimelineSelector";
import { useTaskTimelineHelper } from "@/hooks/task/useTaskTimeline.helper";
import { storageService } from "@/services/storage.service";

export function TaskTimelineHeadless() {
    // Call stores/selectors/helpers directly
    const { timelineRange, setTimelineRange, dayWidth, hasScrolledToToday, setHasScrolledToToday, timelineScrollRef } = useTaskTimelineStore();
    const { filteredTasks, todayPosition } = useTaskTimelineSelector();
    const { checkTodayVisibility } = useTaskTimelineHelper();

    // Effect 0: Reset scroll flag on mount so Effect 3 re-scrolls to today
    useEffect(() => {
        setHasScrolledToToday(false);
    }, []);

    // Effect 1: Initialize timeline range from task dates
    useEffect(() => {
        if (timelineRange) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let minDate = new Date(today);
        let maxDate = new Date(today);

        filteredTasks.forEach((task) => {
            if (task.startDate) {
                if (task.startDate < minDate) minDate = new Date(task.startDate);
                if (task.startDate > maxDate) maxDate = new Date(task.startDate);
            }
            if (task.endDate) {
                if (task.endDate < minDate) minDate = new Date(task.endDate);
                if (task.endDate > maxDate) maxDate = new Date(task.endDate);
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
    }, [filteredTasks, timelineRange]);

    // Effect 2: Persist dayWidth to localStorage
    useEffect(() => {
        storageService.set(STORAGE_KEY_ZOOM, dayWidth);
    }, [dayWidth]);

    // Effect 3: Scroll to today on initial load
    useEffect(() => {
        if (!hasScrolledToToday && timelineScrollRef.current && timelineRange) {
            const clientWidth = timelineScrollRef.current.clientWidth;
            timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday, todayPosition, timelineRange, timelineScrollRef]);

    // Effect 4: Recheck today visibility on dayWidth change
    useEffect(() => {
        checkTodayVisibility();
    }, [checkTodayVisibility, dayWidth]);

    return null;
}
