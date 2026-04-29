/**
 * TaskTimelineView - Timeline/Gantt Chart Component
 * Displays tasks on a timeline with draggable start/end dates
 * Day view only with zoom controls
 *
 * Pure UI — logic lives in useTaskTimelineSelector, useTaskTimelineHelper,
 * useTaskTimelineStore (context), useTaskTimelineHeadless, TaskBar
 */

import React from "react";
import { Loader2, ZoomIn, ZoomOut, Calendar, CornerDownRight } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useTaskTabHelper } from "@/features/taskDetail";
import { useConsoleHelper } from "@/shell";
import { cn } from "@/lib/utils";
import { useTaskTimelineSelector } from "../Selectors/TaskTimelineSelector";
import { useTaskTimelineHelper } from "../hooks/taskTimeline/useTaskTimeline.helper";
import { TaskTimelineProvider, useTaskTimelineStore, DEFAULT_DAY_WIDTH, MIN_DAY_WIDTH, MAX_DAY_WIDTH } from "../store/useTaskTimeline.store";
import { useTaskTimelineHeadless } from "../hooks/taskTimeline/useTaskTimeline.headless";
import { TIMELINE_ROW_HEIGHT, TIMELINE_HEADER_HEIGHT, WEEKEND_STRIPE_BG, formatDateHeader, isWeekend, isToday, isFirstDayOfMonth } from "@/features/taskDetail";
import {TaskBar} from "./small/TaskBar";
import {usePTaskStore} from "../../store/usePTask.store";

/**
 * Inner timeline component that consumes the TaskTimelineProvider context
 * Gets projectId from useProjectDetailStore — NO props.
 */
function TaskTimelineViewInner() {
    const { taskGridIsLoading, taskGridError } = usePTaskStore();
    const { openTaskTab } = useTaskTabHelper();
    const _console = useConsoleHelper();
    useTaskTimelineHeadless();

    // Call stores/selectors/helpers directly — no params passing
    const { hoveredTaskId, setHoveredTaskId, isTodayVisible, dayWidth, timelineScrollRef } = useTaskTimelineStore();
    const { currentProject, filteredTasks, timelineStart, dates, todayPosition, monthGroups } = useTaskTimelineSelector();
    const { handleDateChange, handleScroll, scrollToToday, handleZoomIn, handleZoomOut } = useTaskTimelineHelper();

    const timelineWidth = dates.length * dayWidth;
    const totalHeight = Math.max(filteredTasks.length * TIMELINE_ROW_HEIGHT, 200);

    return (
        <div className="w-full h-full flex flex-col relative">

            {/* Loading Overlay */}
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Error Overlay */}
            {taskGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load tasks</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Timeline Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* Task List (Left Panel) */}
                <div className="w-[200px] flex-shrink-0 border-r bg-muted/30">
                    {/* Header */}
                    <div
                        className="border-b bg-muted/50 flex items-center px-3 font-medium text-sm"
                        style={{ height: TIMELINE_HEADER_HEIGHT }}
                    >
                        Tasks
                    </div>

                    {/* Task Names */}
                    <ScrollArea className="h-[calc(100%-60px)]">
                        {filteredTasks.map((task) => {
                            const isSubtask = !!task.parentTaskId;
                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        "flex items-center cursor-pointer border-b border-transparent",
                                        hoveredTaskId === task.id && "bg-muted/50",
                                        isSubtask ? "px-2 bg-muted/10" : "px-3"
                                    )}
                                    style={{ height: TIMELINE_ROW_HEIGHT }}
                                    onClick={() => openTaskTab(task)}
                                    onMouseEnter={() => setHoveredTaskId(task.id)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                >
                                    {isSubtask && <CornerDownRight className="h-3 w-3 text-muted-foreground mr-1 flex-shrink-0" />}
                                    <span className={cn("truncate", isSubtask ? "text-xs" : "text-sm")}>
                                        {task.title || "Untitled"}
                                    </span>
                                </div>
                            );
                        })}
                        {filteredTasks.length === 0 && (
                            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                                No tasks
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Timeline Grid (Right Panel) */}
                <div
                    ref={timelineScrollRef}
                    className="flex-1 overflow-auto"
                    onScroll={handleScroll}
                >
                    <div style={{ width: timelineWidth, minHeight: "100%" }} className="relative">
                        {/* Today line - full height */}
                        <div
                            className="absolute w-[1px] bg-red-500 z-[5] pointer-events-none"
                            style={{
                                left: todayPosition,
                                top: 0,
                                bottom: 0,
                                height: TIMELINE_HEADER_HEIGHT + totalHeight,
                            }}
                        >
                            {/* Triangle marker at top */}
                            <div
                                className="absolute -top-0 -left-[5px] w-0 h-0"
                                style={{
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: '8px solid rgb(239 68 68)',
                                }}
                            />
                        </div>

                        {/* Timeline Header */}
                        <div className="sticky top-0 z-10 bg-background border-b" style={{ height: TIMELINE_HEADER_HEIGHT }}>
                            {/* Month row */}
                            <div className="flex border-b" style={{ height: 30 }}>
                                {monthGroups.map((group, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center px-2 text-xs font-medium border-r bg-muted/50"
                                        style={{ width: group.days * dayWidth }}
                                    >
                                        {group.month}
                                    </div>
                                ))}
                            </div>

                            {/* Day row */}
                            <div className="flex" style={{ height: 30 }}>
                                {dates.map((date, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex items-center justify-center text-xs",
                                            isWeekend(date) && "text-muted-foreground",
                                            isToday(date) && "font-bold text-red-500",
                                            isFirstDayOfMonth(date) ? "border-r border-border" : "border-r border-dashed border-border/50"
                                        )}
                                        style={{
                                            width: dayWidth,
                                            background: isWeekend(date) && !isToday(date) ? WEEKEND_STRIPE_BG : undefined,
                                        }}
                                    >
                                        {formatDateHeader(date)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grid lines - full height background */}
                        <div
                            className="absolute left-0 right-0 flex pointer-events-none"
                            style={{ top: TIMELINE_HEADER_HEIGHT, height: totalHeight }}
                        >
                            {dates.map((date, index) => (
                                <div
                                    key={index}
                                    className="h-full"
                                    style={{
                                        width: dayWidth,
                                        borderRight: isFirstDayOfMonth(date)
                                            ? '1px solid hsl(var(--border))'
                                            : '1px dashed hsl(var(--border) / 0.5)',
                                        background: isWeekend(date) ? WEEKEND_STRIPE_BG : undefined,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Timeline Rows */}
                        <div style={{ position: 'relative' }}>
                            {filteredTasks.map((task) => {
                                const isSubtask = !!task.parentTaskId;
                                const parentTask = isSubtask
                                    ? filteredTasks.find((t) => t.id === task.parentTaskId) || null
                                    : null;
                                return (
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "relative",
                                            hoveredTaskId === task.id && "bg-muted/40",
                                            isSubtask && "bg-muted/10"
                                        )}
                                        style={{ height: TIMELINE_ROW_HEIGHT }}
                                        onMouseEnter={() => setHoveredTaskId(task.id)}
                                        onMouseLeave={() => setHoveredTaskId(null)}
                                    >
                                        <TaskBar
                                            task={task}
                                            timelineStart={timelineStart}
                                            dayWidth={dayWidth}
                                            onDateChange={handleDateChange}
                                            onTaskClick={openTaskTab}
                                            isSubtask={isSubtask}
                                            parentTask={parentTask}
                                            project={currentProject}
                                            allTasks={filteredTasks}
                                            onValidationError={(msg) => _console.warning(msg)}
                                        />
                                    </div>
                                );
                            })}

                            {/* Empty state */}
                            {filteredTasks.length === 0 && (
                                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                                    No tasks with dates
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer with count and controls */}
            <div className="flex items-center justify-between px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                </div>

                <div className="flex items-center gap-2">
                    {/* Go to Today button - only show when today is not visible */}
                    {!isTodayVisible && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={scrollToToday}
                                        className="h-7 px-2 text-xs"
                                    >
                                        <Calendar className="h-3.5 w-3.5 mr-1" />
                                        Today
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Go to today</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* Zoom controls */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleZoomOut}
                                    disabled={dayWidth <= MIN_DAY_WIDTH}
                                    className="h-7 w-7 p-0"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zoom out</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <span className="text-xs text-muted-foreground w-8 text-center">
                        {Math.round((dayWidth / DEFAULT_DAY_WIDTH) * 100)}%
                    </span>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleZoomIn}
                                    disabled={dayWidth >= MAX_DAY_WIDTH}
                                    className="h-7 w-7 p-0"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zoom in</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}

/**
 * TaskTimelineView — wraps its own TaskTimelineProvider (local context).
 * projectId comes from useProjectDetailStore.
 */
export function TaskTimelineView() {
    return (
        <TaskTimelineProvider>
            <TaskTimelineViewInner />
        </TaskTimelineProvider>
    );
}
