import { useEffect } from "react";
import { useTaskTimelineStore, STORAGE_KEY_ZOOM } from "../../store/useTaskTimeline.store";
import { useTaskTimelineSelector } from "../../Selectors/TaskTimelineSelector";
import { useTaskTimelineHelper } from "./useTaskTimeline.helper";
import { storageService } from "@/shared/services/storage.service";

export function useTaskTimelineHeadless() {
    const { timelineRange, setTimelineRange, dayWidth, hasScrolledToToday, setHasScrolledToToday, timelineScrollRef } = useTaskTimelineStore();
    const { filteredTasks, todayPosition } = useTaskTimelineSelector();
    const { checkTodayVisibility } = useTaskTimelineHelper();

    useEffect(() => {
        setHasScrolledToToday(false);
    }, []);

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

    useEffect(() => {
        storageService.set(STORAGE_KEY_ZOOM, dayWidth);
    }, [dayWidth]);

    useEffect(() => {
        if (!hasScrolledToToday && timelineScrollRef.current && timelineRange) {
            const clientWidth = timelineScrollRef.current.clientWidth;
            timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday, todayPosition, timelineRange, timelineScrollRef]);

    useEffect(() => {
        checkTodayVisibility();
    }, [dayWidth]);
}
