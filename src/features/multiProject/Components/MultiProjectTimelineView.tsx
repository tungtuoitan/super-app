/**
 * MultiProjectTimelineView - Timeline/Gantt Chart for Multiple Projects (Task mode)
 * Pure UI — logic lives in useMultiTimelineSelector, useMultiTimelineHelper,
 * useMultiTimeline.store (context), MultiTimelineHeadless, TaskBar.
 *
 * Parent must:
 *   1. Wrap with <MultiTimelineProvider>
 *   2. Call setProjectIds() and setProjects() before rendering this view
 */

import React, { useEffect } from "react";
import { Loader2, ZoomIn, ZoomOut, Calendar, CornerDownRight } from "lucide-react";
import { Alert, AlertDescription } from "@/shared";
import { ScrollArea } from "@/shared";
import { Button } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useTaskTabHelper } from "@/features/taskDetail";
import { useConsoleHelper } from "@/shared";
import { cn } from "@/lib/utils";
import { TIMELINE_ROW_HEIGHT, TIMELINE_HEADER_HEIGHT, WEEKEND_STRIPE_BG, formatDateHeader, isWeekend, isToday, isFirstDayOfMonth } from "@/features/taskDetail";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiTimelineSelector } from "../Selectors/useMultiTimeline.selector";
import { useMultiTimelineHelper } from "../hooks/mpTimeline/useMultiTimeline.helper";
import { useMultiTimelineHeadless } from "../hooks/mpTimeline/useMultiTimeline.headless";
import { TaskBar } from "@/features/multiProject/Components/small/TaskBar";

export function MultiProjectTimelineView() {
    const { taskGridIsLoading, taskGridError } = useMpTaskStore();
    const { openTaskTab } = useTaskTabHelper();
    const _console = useConsoleHelper();

    // ── Set mode on mount ────────────────────────────────
    const { setMode, setStorageKey } = useMultiTimelineStore();
    useEffect(() => { setMode("task"); setStorageKey("timeline_day_width"); }, []);

    // ── Side-effects (headless) ──────────────────────────
    useMultiTimelineHeadless();

    // ── State (from store) ───────────────────────────────
    const { projects, hoveredItemId, setHoveredItemId, isTodayVisible, dayWidth, timelineScrollRef } = useMultiTimelineStore();

    // ── Computed values (from selector) ──────────────────
    const { filteredTasks, timelineStart, dates, todayPosition, monthGroups, timelineWidth, zoomPercent, canZoomIn, canZoomOut } = useMultiTimelineSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { handleScroll, scrollToToday, handleZoomIn, handleZoomOut, handleTaskDateChange } = useMultiTimelineHelper();

    const totalHeight = Math.max(filteredTasks.length * TIMELINE_ROW_HEIGHT, 200);

    return (
        <div className="w-full h-full flex flex-col relative">
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}
            {taskGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Alert variant="destructive" className="max-w-md"><AlertDescription>Failed to load tasks</AlertDescription></Alert>
                </div>
            )}

            <div className="flex-1 overflow-hidden flex">
                {/* Task List (Left Panel) */}
                <div className="w-[250px] flex-shrink-0 border-r bg-muted/30">
                    <div className="border-b bg-muted/50 flex items-center px-3 font-medium text-sm" style={{ height: TIMELINE_HEADER_HEIGHT }}>Tasks</div>
                    <ScrollArea className="h-[calc(100%-60px)]">
                        {filteredTasks.map((task) => {
                            const isSubtask = !!task.parentTaskId;
                            return (
                                <div key={task.id} className={cn("flex items-center cursor-pointer border-b border-transparent", hoveredItemId === task.id && "bg-muted/50", isSubtask ? "px-2 bg-muted/10" : "px-3")} style={{ height: TIMELINE_ROW_HEIGHT }} onClick={() => openTaskTab(task)} onMouseEnter={() => setHoveredItemId(task.id)} onMouseLeave={() => setHoveredItemId(null)}>
                                    {isSubtask && <CornerDownRight className="h-3 w-3 text-muted-foreground mr-1 flex-shrink-0" />}
                                    <span className={cn("truncate", isSubtask ? "text-xs" : "text-sm")}>{task.title || "Untitled"}</span>
                                </div>
                            );
                        })}
                        {filteredTasks.length === 0 && <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No tasks</div>}
                    </ScrollArea>
                </div>

                {/* Timeline Grid */}
                <div ref={timelineScrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
                    <div style={{ width: timelineWidth, minHeight: "100%" }} className="relative">
                        <div className="absolute w-[1px] bg-red-500 z-[5] pointer-events-none" style={{ left: todayPosition, top: 0, bottom: 0, height: TIMELINE_HEADER_HEIGHT + totalHeight }}>
                            <div className="absolute -top-0 -left-[5px] w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid rgb(239 68 68)" }} />
                        </div>

                        <div className="sticky top-0 z-10 bg-background border-b" style={{ height: TIMELINE_HEADER_HEIGHT }}>
                            <div className="flex border-b" style={{ height: 30 }}>
                                {monthGroups.map((g, i) => <div key={i} className="flex items-center px-2 text-xs font-medium border-r bg-muted/50" style={{ width: g.days * dayWidth }}>{g.month}</div>)}
                            </div>
                            <div className="flex" style={{ height: 30 }}>
                                {dates.map((date, i) => (
                                    <div key={i} className={cn("flex items-center justify-center text-xs", isWeekend(date) && "text-muted-foreground", isToday(date) && "font-bold text-red-500", isFirstDayOfMonth(date) ? "border-r border-border" : "border-r border-dashed border-border/50")} style={{ width: dayWidth, background: isWeekend(date) && !isToday(date) ? WEEKEND_STRIPE_BG : undefined }}>
                                        {formatDateHeader(date)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="absolute left-0 right-0 flex pointer-events-none" style={{ top: TIMELINE_HEADER_HEIGHT, height: totalHeight }}>
                            {dates.map((date, i) => <div key={i} className="h-full" style={{ width: dayWidth, borderRight: isFirstDayOfMonth(date) ? "1px solid hsl(var(--border))" : "1px dashed hsl(var(--border) / 0.5)", background: isWeekend(date) ? WEEKEND_STRIPE_BG : undefined }} />)}
                        </div>

                        <div style={{ position: "relative" }}>
                            {filteredTasks.map((task) => {
                                const isSubtask = !!task.parentTaskId;
                                const parentTask = isSubtask ? filteredTasks.find((t) => t.id === task.parentTaskId) || null : null;
                                const taskProject = projects.find((p) => p.id === task.projectId) || null;
                                return (
                                    <div key={task.id} className={cn("relative", hoveredItemId === task.id && "bg-muted/40", isSubtask && "bg-muted/10")} style={{ height: TIMELINE_ROW_HEIGHT }} onMouseEnter={() => setHoveredItemId(task.id)} onMouseLeave={() => setHoveredItemId(null)}>
                                        <TaskBar task={task} timelineStart={timelineStart} dayWidth={dayWidth} onDateChange={handleTaskDateChange} onTaskClick={openTaskTab} isSubtask={isSubtask} parentTask={parentTask} project={taskProject} allTasks={filteredTasks} onValidationError={(msg) => _console.warning(msg)} />
                                    </div>
                                );
                            })}
                            {filteredTasks.length === 0 && <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No tasks with dates</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} from {projects.length} project{projects.length !== 1 ? "s" : ""}</div>
                <div className="flex items-center gap-2">
                    {!isTodayVisible && (
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={scrollToToday} className="h-7 px-2 text-xs"><Calendar className="h-3.5 w-3.5 mr-1" />Today</Button></TooltipTrigger><TooltipContent>Go to today</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={!canZoomOut} className="h-7 w-7 p-0"><ZoomOut className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Zoom out</TooltipContent></Tooltip></TooltipProvider>
                    <span className="text-xs text-muted-foreground w-8 text-center">{zoomPercent}%</span>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={!canZoomIn} className="h-7 w-7 p-0"><ZoomIn className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Zoom in</TooltipContent></Tooltip></TooltipProvider>
                </div>
            </div>
        </div>
    );
}
