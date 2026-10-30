/**
 * Task Timeline Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import { useTaskTimelineStore } from "../store/useTaskTimeline.store";
import { sortTasksHierarchically, formatMonthHeader, generateDateRange, TIMELINE_SCALE_PX_PER_DAY, buildScaleHeader } from "@/features/taskDetail";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import {usePTaskStore} from "../../store/usePTask.store";

// ── Pure helpers ──────────────────────────────────────────────────────────────

function calcTodayPosition(timelineStart: Date, dayWidth: number): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays * dayWidth + dayWidth / 2;
}

function groupDatesByMonth(dates: Date[]): Array<{ month: string; days: number; startIndex: number }> {
    const groups: Array<{ month: string; days: number; startIndex: number }> = [];
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
}

// ── Selector ──────────────────────────────────────────────────────────────────

export const useTaskTimelineSelector = () => {
    const { tasks } = usePTaskStore();
    const { projectId } = useProjectDetailStore();
    const { projects } = useProjectStore();
    const { timelineRange, dayWidth, timelineScale } = useTaskTimelineStore();

    // Get current project
    const currentProject = projects.find((p) => p.id === projectId);

    // Filter tasks by projectId and sort hierarchically (exclude deleted)
    const projectTasks = tasks.filter((task) => task.projectId === projectId && !task.deletedAt);
    const filteredTasks = sortTasksHierarchically(projectTasks);

    // Calculate dates from range
    const timelineStart = timelineRange?.start ?? new Date();
    const dates = timelineRange ? generateDateRange(timelineRange.start, timelineRange.end) : ([] as Date[]);

    // Scale: "day" uses the zoomable dayWidth, coarser scales use fixed px-per-day
    const pxPerDay = timelineScale === "day" ? dayWidth : TIMELINE_SCALE_PX_PER_DAY[timelineScale];

    // Derived position / grouping
    const todayPosition = calcTodayPosition(timelineStart, pxPerDay);
    const monthGroups = groupDatesByMonth(dates);
    const scaleHeader = timelineScale === "day" ? null : buildScaleHeader(dates, timelineScale, pxPerDay);

    return {
        currentProject,
        filteredTasks,
        timelineStart,
        dates,
        todayPosition,
        monthGroups,
        pxPerDay,
        scaleHeader,
    };
};
