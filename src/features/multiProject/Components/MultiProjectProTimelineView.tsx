/**
 * MultiProjectProTimelineView - Timeline/Gantt Chart for Projects (Project mode)
 * Pure UI — logic lives in useMultiTimelineSelector, useMultiTimelineHelper,
 * useMultiTimeline.store (context), MultiTimelineHeadless, ProjectBar.
 *
 * Parent must:
 *   1. Wrap with <MultiTimelineProvider>
 *   2. Call setProjectIds() and setProjects() before rendering this view
 */

import React, { useEffect } from "react";
import { ZoomIn, ZoomOut, Calendar } from "lucide-react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/Button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useProjectTabHelper } from "@/features/project/hooks/useProjectTab.helper";
import { cn } from "@/lib/utils";
import { getProjectStatusColors } from "@/features/project/Components/ProjectStatusBadge";
import { TIMELINE_HEADER_HEIGHT, WEEKEND_STRIPE_BG, formatDateHeader, isWeekend, isToday, isFirstDayOfMonth } from "@/features/task/utils/TaskGrid.utils";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiTimelineSelector } from "../Selectors/useMultiTimeline.selector";
import { useMultiTimelineHelper } from "../hooks/mpTimeline/useMultiTimeline.helper";
import { useMultiTimelineHeadless } from "../hooks/mpTimeline/useMultiTimeline.headless";
import { ProjectBar } from "./small/ProjectBar";
import { PRO_ROW_HEIGHT } from "../utils/multiProjectDetail.constants";

export function MultiProjectProTimelineView() {
    const { openProjectTab } = useProjectTabHelper();

    // ── Set mode on mount ────────────────────────────────
    const { setMode, setStorageKey } = useMultiTimelineStore();
    useEffect(() => { setMode("project"); setStorageKey("pro_timeline_day_width"); }, []);

    // ── Side-effects (headless) ──────────────────────────
    useMultiTimelineHeadless();

    // ── State (from store) ───────────────────────────────
    const { hoveredItemId, setHoveredItemId, isTodayVisible, dayWidth, timelineScrollRef } = useMultiTimelineStore();

    // ── Computed values (from selector) ──────────────────
    const { filteredProjects, timelineStart, dates, todayPosition, monthGroups, timelineWidth, zoomPercent, canZoomIn, canZoomOut } = useMultiTimelineSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { handleScroll, scrollToToday, handleZoomIn, handleZoomOut, handleProjectDateChange } = useMultiTimelineHelper();

    const totalHeight = Math.max(filteredProjects.length * PRO_ROW_HEIGHT, 200);

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="flex-1 overflow-hidden flex">
                {/* Project List (Left Panel) */}
                <div className="w-[280px] flex-shrink-0 border-r bg-muted/30">
                    <div className="border-b bg-muted/50 flex items-center px-3 font-bold text-xs uppercase tracking-wider" style={{ height: TIMELINE_HEADER_HEIGHT }}>Projects</div>
                    <ScrollArea className="h-[calc(100%-60px)]">
                        {filteredProjects.map((project) => {
                            const statusColors = getProjectStatusColors(project.status || "");
                            return (
                                <div key={project.id} className={cn("flex items-center gap-3 cursor-pointer border-b border-transparent px-3", hoveredItemId === project.id && "bg-muted/50")} style={{ height: PRO_ROW_HEIGHT }} onClick={() => openProjectTab(project)} onMouseEnter={() => setHoveredItemId(project.id)} onMouseLeave={() => setHoveredItemId(null)}>
                                    <span className="w-1 h-6 rounded-sm flex-shrink-0" style={{ backgroundColor: statusColors.bg }} />
                                    <span className="truncate text-sm font-semibold uppercase tracking-wide">{project.name || "Untitled"}</span>
                                </div>
                            );
                        })}
                        {filteredProjects.length === 0 && <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No projects</div>}
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
                            {filteredProjects.map((project) => (
                                <div key={project.id} className={cn("relative", hoveredItemId === project.id && "bg-muted/40")} style={{ height: PRO_ROW_HEIGHT }} onMouseEnter={() => setHoveredItemId(project.id)} onMouseLeave={() => setHoveredItemId(null)}>
                                    <ProjectBar project={project} timelineStart={timelineStart} dayWidth={dayWidth} onDateChange={handleProjectDateChange} onProjectClick={openProjectTab} />
                                </div>
                            ))}
                            {filteredProjects.length === 0 && <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No projects with dates</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-background border-t-2 border-primary/20">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{filteredProjects.length} Project{filteredProjects.length !== 1 ? "s" : ""}</div>
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
