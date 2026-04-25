/**
 * Multi-Project Timeline Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Calls stores directly — no params.
 */

import { useMemo } from "react";
import { Task, useTaskStore } from "@/features/task/store/useTask.store";
import { useMultiTimelineStore, DEFAULT_DAY_WIDTH, MIN_DAY_WIDTH, MAX_DAY_WIDTH } from "@/features/multiProject/store/useMultiTimeline.store";
import { generateDateRange, formatMonthHeader } from "@/features/task/utils/TaskGrid.utils";

export const useMultiTimelineSelector = () => {
    const { projectIds, projects, mode, timelineRange, dayWidth } = useMultiTimelineStore();
    const { tasks } = useTaskStore();

    // ── Filtered & sorted tasks (for mode === "task") ────
    const filteredTasks = useMemo(() => {
        if (mode !== "task") return [];

        const projectTasks = tasks.filter((t) => projectIds.includes(t.projectId) && !t.deletedAt);
        const parentTasks = projectTasks.filter((t) => !t.parentTaskId);
        const subtasks = projectTasks.filter((t) => t.parentTaskId);

        parentTasks.sort((a, b) => {
            if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
            if (a.startDate) return -1;
            if (b.startDate) return 1;
            return (a.title || "").localeCompare(b.title || "");
        });

        const result: Task[] = [];
        parentTasks.forEach((parent) => {
            result.push(parent);
            const childTasks = subtasks
                .filter((s) => s.parentTaskId === parent.id)
                .sort((a, b) => {
                    if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
                    if (a.startDate) return -1;
                    if (b.startDate) return 1;
                    return (a.title || "").localeCompare(b.title || "");
                });
            result.push(...childTasks);
        });

        const usedSubtaskIds = new Set(result.filter((t) => t.parentTaskId).map((t) => t.id));
        result.push(...subtasks.filter((s) => !usedSubtaskIds.has(s.id)));
        return result;
    }, [mode, tasks, projectIds]);

    // ── Filtered & sorted projects (for mode === "project") ──
    const filteredProjects = useMemo(() => {
        if (mode !== "project") return [];

        return projects
            .filter((p) => !p.deletedAt)
            .sort((a, b) => {
                if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
                if (a.startDate) return -1;
                if (b.startDate) return 1;
                return (a.name || "").localeCompare(b.name || "");
            });
    }, [mode, projects]);

    // ── Items for range computation (generic) ────────────
    const items = mode === "task" ? filteredTasks : filteredProjects;

    // ── Dates from range ─────────────────────────────────
    const { timelineStart, dates } = useMemo(() => {
        if (!timelineRange) return { timelineStart: new Date(), dates: [] as Date[] };
        return { timelineStart: timelineRange.start, dates: generateDateRange(timelineRange.start, timelineRange.end) };
    }, [timelineRange]);

    // ── Today line position ──────────────────────────────
    const todayPosition = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays * dayWidth + dayWidth / 2;
    }, [timelineStart, dayWidth]);

    // ── Month groups for header ──────────────────────────
    const monthGroups = useMemo(() => {
        const groups: { month: string; days: number; startIndex: number }[] = [];
        let currentMonth = "";
        let currentCount = 0;
        let startIndex = 0;

        dates.forEach((date, index) => {
            const month = formatMonthHeader(date);
            if (month !== currentMonth) {
                if (currentMonth) groups.push({ month: currentMonth, days: currentCount, startIndex });
                currentMonth = month;
                currentCount = 1;
                startIndex = index;
            } else {
                currentCount++;
            }
        });

        if (currentMonth) groups.push({ month: currentMonth, days: currentCount, startIndex });
        return groups;
    }, [dates]);

    // ── Zoom info ────────────────────────────────────────
    const timelineWidth = dates.length * dayWidth;
    const zoomPercent = Math.round((dayWidth / DEFAULT_DAY_WIDTH) * 100);
    const canZoomIn = dayWidth < MAX_DAY_WIDTH;
    const canZoomOut = dayWidth > MIN_DAY_WIDTH;

    return {
        filteredTasks,
        filteredProjects,
        items,
        timelineStart,
        dates,
        todayPosition,
        monthGroups,
        timelineWidth,
        zoomPercent,
        canZoomIn,
        canZoomOut,
    };
};
