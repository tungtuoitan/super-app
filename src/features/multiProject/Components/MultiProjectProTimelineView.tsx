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
import { ScrollArea } from "@/shared";
import { Button } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { useProjectTabHelper } from "@/features/project";
import { TaskStatusIcon } from "@/shared";
import { cn } from "@/lib/utils";
import { TIMELINE_HEADER_HEIGHT } from "@/features/taskDetail";
import { useMultiTimelineStore, WEEK_WIDTH_STORAGE_KEY } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiTimelineSelector } from "../Selectors/useMultiTimeline.selector";
import { useMultiTimelineHelper } from "../hooks/mpTimeline/useMultiTimeline.helper";
import { useMultiTimelineHeadless } from "../hooks/mpTimeline/useMultiTimeline.headless";
import { ProjectBar } from "./small/ProjectBar";
import { PRO_ROW_HEIGHT } from "../utils/multiProjectDetail.constants";

export function MultiProjectProTimelineView() {
    const { openProjectTab } = useProjectTabHelper();

    // ── Set mode on mount ────────────────────────────────
    const { setMode, setStorageKey } = useMultiTimelineStore();
    useEffect(() => {
        setMode("project");
        setStorageKey(WEEK_WIDTH_STORAGE_KEY);
    }, []);

    // ── Side-effects (headless) ──────────────────────────
    useMultiTimelineHeadless();

    // ── State (from store) ───────────────────────────────
    const { hoveredItemId, setHoveredItemId, isTodayVisible, weekWidth, timelineScrollRef } = useMultiTimelineStore();

    // ── Computed values (from selector) ──────────────────
    const { filteredProjects, timelineStart, timelineEnd, pxPerDay, weeks, weekMonthGroups, todayPosition, timelineWidth, zoomPercent, canZoomIn, canZoomOut } = useMultiTimelineSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { handleScroll, scrollToToday, handleZoomIn, handleZoomOut, handleProjectDateChange } = useMultiTimelineHelper();

    const totalHeight = Math.max(filteredProjects.length * PRO_ROW_HEIGHT, 200);

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="flex-1 overflow-hidden flex">
                {/* Project List (Left Panel) */}
                <div className="w-[280px] flex-shrink-0 border-r border-sa-border bg-sa-surface">
                    <div className="border-b border-sa-border flex items-center px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground" style={{ height: TIMELINE_HEADER_HEIGHT }}>
                        Projects
                    </div>
                    <ScrollArea className="h-[calc(100%-60px)]">
                        {filteredProjects.map((project) => {
                            return (
                                <div
                                    key={project.id}
                                    className={cn("flex items-center gap-3 cursor-pointer border-b border-transparent px-3", hoveredItemId === project.id && "bg-sa-hover")}
                                    style={{ height: PRO_ROW_HEIGHT }}
                                    onClick={() => openProjectTab(project)}
                                    onMouseEnter={() => setHoveredItemId(project.id)}
                                    onMouseLeave={() => setHoveredItemId(null)}
                                >
                                    <TaskStatusIcon status={project.status} />
                                    <span className="truncate text-[13px] text-foreground">{project.name || "Untitled"}</span>
                                </div>
                            );
                        })}
                        {filteredProjects.length === 0 && <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No projects</div>}
                    </ScrollArea>
                </div>

                {/* Timeline Grid */}
                <div ref={timelineScrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
                    <div style={{ width: timelineWidth, minHeight: "100%" }} className="relative">
                        <div
                            className="absolute w-[1px] bg-sa-amber z-[5] pointer-events-none"
                            style={{ left: todayPosition, top: 0, bottom: 0, height: TIMELINE_HEADER_HEIGHT + totalHeight }}
                        >
                            <div
                                className="absolute -top-0 -left-[5px] w-0 h-0"
                                style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid hsl(var(--sa-accent-amber))" }}
                            />
                        </div>

                        <div className="sticky top-0 z-10 bg-background border-b" style={{ height: TIMELINE_HEADER_HEIGHT }}>
                            <div className="flex border-b" style={{ height: 30 }}>
                                {weekMonthGroups.map((g, i) => (
                                    <div key={i} className="flex items-center px-2 text-xs font-medium text-foreground border-r border-sa-border bg-sa-surface overflow-hidden whitespace-nowrap" style={{ width: g.weeks * weekWidth }}>
                                        {g.month}
                                    </div>
                                ))}
                            </div>
                            <div className="flex" style={{ height: 30 }}>
                                {weeks.map((week, i) => (
                                    <div
                                        key={i}
                                        title={week.title}
                                        className={cn(
                                            "flex items-center justify-center text-xs overflow-hidden whitespace-nowrap",
                                            week.isCurrent && "font-bold text-sa-amber-ink bg-sa-amber/5",
                                            week.isMonthEnd ? "border-r border-border" : "border-r border-dashed border-border/50",
                                        )}
                                        style={{ width: weekWidth }}
                                    >
                                        {week.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="absolute left-0 right-0 flex pointer-events-none" style={{ top: TIMELINE_HEADER_HEIGHT, height: totalHeight }}>
                            {weeks.map((week, i) => (
                                <div
                                    key={i}
                                    className={cn("h-full", week.isCurrent && "bg-sa-amber/5")}
                                    style={{
                                        width: weekWidth,
                                        borderRight: week.isMonthEnd ? "1px solid hsl(var(--border))" : "1px dashed hsl(var(--border) / 0.5)",
                                    }}
                                />
                            ))}
                        </div>

                        <div style={{ position: "relative" }}>
                            {filteredProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className={cn("relative", hoveredItemId === project.id && "bg-sa-hover")}
                                    style={{ height: PRO_ROW_HEIGHT }}
                                    onMouseEnter={() => setHoveredItemId(project.id)}
                                    onMouseLeave={() => setHoveredItemId(null)}
                                >
                                    <ProjectBar
                                        project={project}
                                        timelineStart={timelineStart}
                                        timelineEnd={timelineEnd}
                                        dayWidth={pxPerDay}
                                        onDateChange={handleProjectDateChange}
                                        onProjectClick={openProjectTab}
                                    />
                                </div>
                            ))}
                            {filteredProjects.length === 0 && <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No projects with dates</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex h-9 items-center justify-between px-3 bg-background border-t border-sa-border">
                <div className="text-[12px] text-muted-foreground">
                    {filteredProjects.length} Project{filteredProjects.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2">
                    {!isTodayVisible && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={scrollToToday} className="h-7 px-2 text-xs">
                                        <Calendar className="h-3.5 w-3.5 mr-1" />
                                        Today
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Go to today</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={!canZoomOut} className="h-7 w-7 p-0">
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zoom out</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground w-8 text-center">{zoomPercent}%</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={!canZoomIn} className="h-7 w-7 p-0">
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
