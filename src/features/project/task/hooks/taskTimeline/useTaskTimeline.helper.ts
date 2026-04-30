/**
 * Task Timeline Helper
 * Callbacks only (useCallback). Handles date changes, scroll, zoom, and API calls.
 * Gets projectId from useProjectDetailStore — NO params.
 */

import type { Task } from "@/features/taskDetail";
import { useConsoleHelper } from "@/shared";
import { taskService } from "@/features/taskDetail";
import { toLocalISOString } from "@/shared";
import { constants } from "@/shared";
import { useTaskTimelineStore, MIN_DAY_WIDTH, MAX_DAY_WIDTH } from "../../store/useTaskTimeline.store";
import { useTaskTimelineSelector } from "../../Selectors/TaskTimelineSelector";
import { TIMELINE_EXTEND_DAYS, TIMELINE_ZOOM_STEP } from "@/features/taskDetail";
import { useProjectDetailStore } from "@/features/project/store/useProjectDetail.store";
import {useAuthStore} from "@/shared";
import {useEditorTabBarStore} from "@/shell";
import {usePTaskStore} from "@/features/project/store/usePTask.store";

export const useTaskTimelineHelper = () => {
    const { setTasks } = usePTaskStore();
    const { $user } = useAuthStore();
    const { setOpenTabs } = useEditorTabBarStore();
    const { projectId } = useProjectDetailStore();
    const _console = useConsoleHelper();

    // Call stores/selectors directly
    const { timelineRange, setTimelineRange, dayWidth, setDayWidth, setIsTodayVisible, timelineScrollRef } = useTaskTimelineStore();
    const { filteredTasks, currentProject, todayPosition } = useTaskTimelineSelector();

    // Check if today is visible
    const checkTodayVisibility = () => {
        if (!timelineScrollRef.current) return;
        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        const isVisible = todayPosition >= scrollLeft && todayPosition <= scrollLeft + clientWidth;
        setIsTodayVisible(isVisible);
    }

    // Handle date change from drag with validation
    const handleDateChange =
        async (taskId: number, startDate: Date | null, endDate: Date | null) => {
            const task = filteredTasks.find((t) => t.id === taskId);
            if (!task) return;

            // Validate subtask date constraints
            if (task.parentTaskId) {
                const parentTask = filteredTasks.find((t) => t.id === task.parentTaskId);
                if (parentTask) {
                    if (parentTask.startDate && startDate && startDate < parentTask.startDate) {
                        _console.error(`Subtask start date cannot be before parent task start date`);
                        return;
                    }
                    if (parentTask.endDate && endDate && endDate > parentTask.endDate) {
                        _console.error(`Subtask end date cannot be after parent task end date`);
                        return;
                    }
                }
            }

            // Validate task date constraints (project dates)
            if (!task.parentTaskId && currentProject) {
                if (currentProject.startDate && startDate && startDate < currentProject.startDate) {
                    _console.error(`Task start date cannot be before project start date`);
                    return;
                }
                if (currentProject.endDate && endDate && endDate > currentProject.endDate) {
                    _console.error(`Task end date cannot be after project end date`);
                    return;
                }
            }

            // Optimistic: update local state immediately
            const oldStartDate = task.startDate;
            const oldEndDate = task.endDate;
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, startDate, endDate } : t)),
            );

            // Sync open task tab immediately
            setOpenTabs((prev) =>
                prev.map((tab) => {
                    if (
                        tab.type === constants.vscode.tab.tabTypes.task &&
                        (tab.data as Task).id === taskId
                    ) {
                        const updated: Task = {
                            ...(tab.data as Task),
                            startDate,
                            endDate,
                            updatedAt: new Date(),
                        };
                        return { ...tab, data: updated, data0: updated, hasUnsavedChanges: false };
                    }
                    return tab;
                })
            );

            try {
                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: task.status,
                    priority: task.priority,
                    startDate: toLocalISOString(startDate),
                    endDate: toLocalISOString(endDate),
                    orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson,
                    processJson: task.processJson,
                    customTabsJson: task.customTabsJson,
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
        }

    // Handle scroll to extend timeline and check today visibility
    const handleScroll = () => {
        if (!timelineScrollRef.current || !timelineRange) return;

        const { scrollLeft, scrollWidth, clientWidth } = timelineScrollRef.current;

        checkTodayVisibility();

        if (scrollLeft < 100) {
            const newStart = new Date(timelineRange.start);
            newStart.setDate(newStart.getDate() - TIMELINE_EXTEND_DAYS);
            setTimelineRange(prev => prev ? { ...prev, start: newStart } : null);

            setTimeout(() => {
                if (timelineScrollRef.current) {
                    timelineScrollRef.current.scrollLeft = scrollLeft + TIMELINE_EXTEND_DAYS * dayWidth;
                }
            }, 0);
        }

        if (scrollLeft + clientWidth > scrollWidth - 100) {
            const newEnd = new Date(timelineRange.end);
            newEnd.setDate(newEnd.getDate() + TIMELINE_EXTEND_DAYS);
            setTimelineRange(prev => prev ? { ...prev, end: newEnd } : null);
        }
    }
    // Scroll to today
    const scrollToToday = () => {
        if (!timelineScrollRef.current) return;
        const clientWidth = timelineScrollRef.current.clientWidth;
        timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
    }

    // Zoom handlers - maintain center point
    const handleZoom = (newDayWidth: number) => {
        if (!timelineScrollRef.current) {
            setDayWidth(newDayWidth);
            return;
        }

        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        const centerX = scrollLeft + clientWidth / 2;
        const centerDay = centerX / dayWidth;

        setDayWidth(newDayWidth);

        setTimeout(() => {
            if (timelineScrollRef.current) {
                const newCenterX = centerDay * newDayWidth;
                timelineScrollRef.current.scrollLeft = newCenterX - clientWidth / 2;
            }
        }, 0);
    }

    const handleZoomIn = () => {
        handleZoom(Math.min(dayWidth + TIMELINE_ZOOM_STEP, MAX_DAY_WIDTH));
    }

    const handleZoomOut = () => {
        handleZoom(Math.max(dayWidth - TIMELINE_ZOOM_STEP, MIN_DAY_WIDTH));
    }

    return {
        handleDateChange,
        handleScroll,
        scrollToToday,
        handleZoomIn,
        handleZoomOut,
        checkTodayVisibility,
    };
};
