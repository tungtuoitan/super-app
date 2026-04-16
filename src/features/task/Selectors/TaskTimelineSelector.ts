import { useGridControlStore } from "@/store/useGridControl.store";
/**
 * Task Timeline Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import { useMemo } from "react";
import { useTaskStore } from "../store/useTask.store";
import { useTaskTimelineStore } from "../store/useTaskTimeline.store";
import { sortTasksHierarchically, formatMonthHeader, generateDateRange } from "../utils/TaskGrid.utils";

export const useTaskTimelineSelector = () => {
    const { tasks } = useTaskStore();
    const { projects, projectId } = useGridControlStore();
    const { timelineRange, dayWidth } = useTaskTimelineStore();

    // Get current project
    const currentProject = useMemo(() => {
        return projects.find((p) => p.id === projectId);
    }, [projects, projectId]);

    // Filter tasks by projectId and sort hierarchically (exclude deleted)
    const filteredTasks = useMemo(() => {
        const projectTasks = tasks.filter((task) => task.projectId === projectId && !task.deletedAt);
        return sortTasksHierarchically(projectTasks);
    }, [tasks, projectId]);

    // Calculate dates from range
    const { timelineStart, dates } = useMemo(() => {
        if (!timelineRange) {
            return { timelineStart: new Date(), dates: [] as Date[] };
        }
        const allDates = generateDateRange(timelineRange.start, timelineRange.end);
        return {
            timelineStart: timelineRange.start,
            dates: allDates,
        };
    }, [timelineRange]);

    // Calculate today line position
    const todayPosition = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays * dayWidth + dayWidth / 2;
    }, [timelineStart, dayWidth]);

    // Group dates by month for header
    const monthGroups = useMemo(() => {
        const groups: { month: string; days: number; startIndex: number }[] = [];
        let currentMonth = "";
        let currentCount = 0;
        let startIndex = 0;

        dates.forEach((date, index) => {
            const month = formatMonthHeader(date);
            if (month !== currentMonth) {
                if (currentMonth) {
                    groups.push({ month: currentMonth, days: currentCount, startIndex });
                }
                currentMonth = month;
                currentCount = 1;
                startIndex = index;
            } else {
                currentCount++;
            }
        });

        if (currentMonth) {
            groups.push({ month: currentMonth, days: currentCount, startIndex });
        }

        return groups;
    }, [dates]);

    return {
        currentProject,
        filteredTasks,
        timelineStart,
        dates,
        todayPosition,
        monthGroups,
    };
};
