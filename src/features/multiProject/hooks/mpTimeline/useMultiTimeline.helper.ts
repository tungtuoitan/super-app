/**
 * Multi-Project Timeline Helper
 * Callbacks only (useCallback). Handles scroll, zoom, date changes, and API calls.
 * Calls stores/selectors directly — no params.
 */

import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useProjectStore } from "@/features/project";
import { useConsoleHelper } from "@/shared";
import { taskService } from "@/features/taskDetail";
import { projectService } from "@/features/project";
import { toDateOnly } from "@/shared";
import {
    useMultiTimelineStore, MIN_DAY_WIDTH, MAX_DAY_WIDTH,
    MIN_WEEK_WIDTH, MAX_WEEK_WIDTH, WEEK_ZOOM_STEP,
} from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiTimelineSelector } from "../../Selectors/useMultiTimeline.selector";
import { TIMELINE_EXTEND_DAYS, TIMELINE_ZOOM_STEP } from "@/features/taskDetail";
import {useAuthStore} from "@/shared";

export const useMultiTimelineHelper = () => {
    // ── Stores ───────────────────────────────────────────
    const { setTasks } = useMpTaskStore();
    const { setProjects } = useProjectStore();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();

    const {
        projectIds, mode, timelineRange, setTimelineRange,
        dayWidth, setDayWidth, weekWidth, setWeekWidth, setIsTodayVisible, timelineScrollRef,
    } = useMultiTimelineStore();

    // ── Selector ─────────────────────────────────────────
    const { filteredTasks, filteredProjects, todayPosition, pxPerDay } = useMultiTimelineSelector();

    // ── Today visibility ─────────────────────────────────
    const checkTodayVisibility = () => {
        if (!timelineScrollRef.current) return;
        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        setIsTodayVisible(todayPosition >= scrollLeft && todayPosition <= scrollLeft + clientWidth);
    };

    // ── Scroll (infinite extend on edges) ────────────────
    const handleScroll = () => {
        if (!timelineScrollRef.current || !timelineRange) return;
        const { scrollLeft, scrollWidth, clientWidth } = timelineScrollRef.current;
        checkTodayVisibility();

        if (scrollLeft < 100) {
            const newStart = new Date(timelineRange.start);
            newStart.setDate(newStart.getDate() - TIMELINE_EXTEND_DAYS);
            setTimelineRange((prev) => (prev ? { ...prev, start: newStart } : null));
            setTimeout(() => {
                if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = scrollLeft + TIMELINE_EXTEND_DAYS * pxPerDay;
            }, 0);
        }

        if (scrollLeft + clientWidth > scrollWidth - 100) {
            const newEnd = new Date(timelineRange.end);
            newEnd.setDate(newEnd.getDate() + TIMELINE_EXTEND_DAYS);
            setTimelineRange((prev) => (prev ? { ...prev, end: newEnd } : null));
        }
    };

    // ── Scroll to today ──────────────────────────────────
    const scrollToToday = () => {
        if (!timelineScrollRef.current) return;
        timelineScrollRef.current.scrollLeft = todayPosition - timelineScrollRef.current.clientWidth / 2;
    };

    // ── Zoom (maintain center point) ─────────────────────
    // Task mode zooms the day column, project mode zooms the week column.
    const handleZoom = (newColumnWidth: number) => {
        const newPxPerDay = mode === "project" ? newColumnWidth / 7 : newColumnWidth;
        const setColumnWidth = mode === "project" ? setWeekWidth : setDayWidth;
        if (!timelineScrollRef.current) { setColumnWidth(newColumnWidth); return; }
        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        const centerDay = (scrollLeft + clientWidth / 2) / pxPerDay;
        setColumnWidth(newColumnWidth);
        setTimeout(() => {
            if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = centerDay * newPxPerDay - clientWidth / 2;
        }, 0);
    };

    const handleZoomIn = () => {
        if (mode === "project") handleZoom(Math.min(weekWidth + WEEK_ZOOM_STEP, MAX_WEEK_WIDTH));
        else handleZoom(Math.min(dayWidth + TIMELINE_ZOOM_STEP, MAX_DAY_WIDTH));
    };

    const handleZoomOut = () => {
        if (mode === "project") handleZoom(Math.max(weekWidth - WEEK_ZOOM_STEP, MIN_WEEK_WIDTH));
        else handleZoom(Math.max(dayWidth - TIMELINE_ZOOM_STEP, MIN_DAY_WIDTH));
    };

    // ── Task date change (optimistic) ──────────────────
    const handleTaskDateChange = async (taskId: number, startDate: Date | null, endDate: Date | null) => {
        const task = filteredTasks.find((t) => t.id === taskId);
        if (!task) return;

        // Optimistic: update local state immediately
        const oldStartDate = task.startDate;
        const oldEndDate = task.endDate;
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, startDate, endDate } : t)),
        );

        try {
            const upsertData = {
                id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                type: task.type, title: task.title, description: task.description,
                status: task.status, priority: task.priority,
                startDate: toDateOnly(startDate), endDate: toDateOnly(endDate),
                orderIndex: task.orderIndex,
                folderWorkspaceItemId: task.folderWorkspaceItemId,
                checklistJson: task.checklistJson,
                processJson: task.processJson,
                customTabsJson: task.customTabsJson,
                isMilestone: task.isMilestone,
            };
            const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

            if (!result.success) {
                // Revert on failure
                setTasks((prev) =>
                    prev.map((t) => (t.id === taskId ? { ...t, startDate: oldStartDate, endDate: oldEndDate } : t)),
                );
                _console.error("Failed to update task dates");
            }
        } catch (error) {
            // Revert on error
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, startDate: oldStartDate, endDate: oldEndDate } : t)),
            );
            console.error("Failed to update task dates:", error);
        }
    };

    // ── Project date change (API call) ───────────────────
    const handleProjectDateChange = async (projectId: number, startDate: Date | null, endDate: Date | null) => {
        const project = filteredProjects.find((p) => p.id === projectId);
        if (!project) return;

        try {
            const upsertData = {
                id: project.id,
                name: project.name || "",
                startDate: toDateOnly(startDate),
                endDate: toDateOnly(endDate),
            };
            const result = await projectService.upsertProjectBatch($user.userToken, [upsertData]);
            if (result.success) {
                setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, startDate, endDate } : p)));
                _console.success("Project dates updated");
            }
        } catch (error) {
            console.error("Failed to update project dates:", error);
            _console.error("Failed to update project dates");
        }
    };

    return {
        checkTodayVisibility,
        handleScroll,
        scrollToToday,
        handleZoomIn,
        handleZoomOut,
        handleTaskDateChange,
        handleProjectDateChange,
    };
};
