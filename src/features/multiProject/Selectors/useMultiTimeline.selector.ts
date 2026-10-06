/**
 * Multi-Project Timeline Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Calls stores directly — no params.
 */

import { useMemo } from "react";
import type { Task } from "@/features/taskDetail";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import {
    useMultiTimelineStore, DEFAULT_DAY_WIDTH, MIN_DAY_WIDTH, MAX_DAY_WIDTH,
    DEFAULT_WEEK_WIDTH, MIN_WEEK_WIDTH, MAX_WEEK_WIDTH,
} from "@/features/multiProject/store/useMultiTimeline.store";
import { generateDateRange, formatMonthHeader } from "@/features/taskDetail";

export const useMultiTimelineSelector = () => {
    const { projectIds, projects, mode, timelineRange, dayWidth, weekWidth } = useMultiTimelineStore();
    const { tasks } = useMpTaskStore();

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

    // ── Scale: project mode packs 7 days into 1 week column ──
    const pxPerDay = mode === "project" ? weekWidth / 7 : dayWidth;

    // ── Dates from range (project mode: snapped to whole Mon–Sun weeks) ──
    const { timelineStart, dates } = useMemo(() => {
        if (!timelineRange) return { timelineStart: new Date(), dates: [] as Date[] };
        if (mode !== "project") return { timelineStart: timelineRange.start, dates: generateDateRange(timelineRange.start, timelineRange.end) };

        const start = new Date(timelineRange.start);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        const end = new Date(timelineRange.end);
        end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
        return { timelineStart: start, dates: generateDateRange(start, end) };
    }, [timelineRange, mode]);

    const timelineEnd = dates.length ? dates[dates.length - 1] : null;

    // ── Week columns (project mode) ──────────────────────
    const weeks = useMemo(() => {
        if (mode !== "project") return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result: { start: Date; label: string; title: string; isCurrent: boolean; isMonthEnd: boolean }[] = [];
        for (let i = 0; i + 6 < dates.length; i += 7) {
            const start = dates[i];
            const end = dates[i + 6];
            const nextStart = dates[i + 7];
            result.push({
                start,
                label: `${start.getDate()}–${end.getDate()}`,
                title: `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`,
                isCurrent: today >= start && today <= end,
                isMonthEnd: !!nextStart && nextStart.getMonth() !== start.getMonth(),
            });
        }
        return result;
    }, [mode, dates]);

    // ── Month groups for week header (a week belongs to the month of its Thursday) ──
    const weekMonthGroups = useMemo(() => {
        const groups: { month: string; weeks: number }[] = [];
        weeks.forEach((week) => {
            const thursday = new Date(week.start);
            thursday.setDate(thursday.getDate() + 3);
            const month = formatMonthHeader(thursday);
            const last = groups[groups.length - 1];
            if (last && last.month === month) last.weeks++;
            else groups.push({ month, weeks: 1 });
        });
        return groups;
    }, [weeks]);

    // ── Today line position ──────────────────────────────
    const todayPosition = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays * pxPerDay + pxPerDay / 2;
    }, [timelineStart, pxPerDay]);

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
    const timelineWidth = dates.length * pxPerDay;
    const zoomPercent = mode === "project" ? Math.round((weekWidth / DEFAULT_WEEK_WIDTH) * 100) : Math.round((dayWidth / DEFAULT_DAY_WIDTH) * 100);
    const canZoomIn = mode === "project" ? weekWidth < MAX_WEEK_WIDTH : dayWidth < MAX_DAY_WIDTH;
    const canZoomOut = mode === "project" ? weekWidth > MIN_WEEK_WIDTH : dayWidth > MIN_DAY_WIDTH;

    return {
        filteredTasks,
        filteredProjects,
        items,
        timelineStart,
        timelineEnd,
        dates,
        pxPerDay,
        weeks,
        weekMonthGroups,
        todayPosition,
        monthGroups,
        timelineWidth,
        zoomPercent,
        canZoomIn,
        canZoomOut,
    };
};
