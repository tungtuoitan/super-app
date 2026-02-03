/**
 * MultiProjectProTimelineView - Timeline/Gantt Chart for Projects
 * Displays projects on a timeline (similar to task timeline but for projects)
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { Loader2, ZoomIn, ZoomOut, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { Project, useProjectStore } from "@/store/project/useProject.store";
import { useProjectTabHelper } from "@/hooks/project/useProjectTab.helper";
import { useAuthStore } from "@/store/index";
import { projectService } from "@/services/project.service";
import { storageService } from "@/services/storage.service";
import { cn } from "@/lib/utils";
import { constants } from "@/utils/constants";
import { toLocalISOString } from "@/utils/date.utils";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { getProjectStatusColors } from "./ProjectStatusBadge";

interface MultiProjectProTimelineViewProps {
    projectIds: number[];
    projects: Project[];
}

// Constants
const STORAGE_KEY_ZOOM = "pro_timeline_day_width";
const DEFAULT_DAY_WIDTH = 40;
const MIN_DAY_WIDTH = 20;
const MAX_DAY_WIDTH = 80;
const ZOOM_STEP = 10;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const PROJECT_BAR_HEIGHT = 32;
const MIN_BAR_WIDTH = 20;
const EXTEND_DAYS = 14;
const PROJECT_BAR_COLOR = "#1e3a5f";

const WEEKEND_STRIPE_BG = `repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    hsl(var(--muted-foreground) / 0.15) 3px,
    hsl(var(--muted-foreground) / 0.15) 6px
)`;

function generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function formatDateHeader(date: Date): string {
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    return `${dayNames[date.getDay()]} ${date.getDate()}`;
}

function formatMonthHeader(date: Date): string {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function isFirstDayOfMonth(date: Date): boolean {
    return date.getDate() === 1;
}

interface ProjectBarProps {
    project: Project;
    timelineStart: Date;
    dayWidth: number;
    onDateChange: (projectId: number, startDate: Date | null, endDate: Date | null) => void;
    onProjectClick: (project: Project) => void;
}

function ProjectBar({ project, timelineStart, dayWidth, onDateChange, onProjectClick }: ProjectBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const [dragType, setDragType] = useState<"move" | "resize-left" | "resize-right" | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [originalLeft, setOriginalLeft] = useState(0);
    const [originalWidth, setOriginalWidth] = useState(0);
    const [currentLeft, setCurrentLeft] = useState(0);
    const [currentWidth, setCurrentWidth] = useState(0);

    const statusColors = getProjectStatusColors(project.status || "");

    const { left, width, hasValidDates } = useMemo(() => {
        if (!project.startDate && !project.endDate) {
            return { left: 0, width: MIN_BAR_WIDTH, hasValidDates: false };
        }

        const start = project.startDate || project.endDate || new Date();
        const end = project.endDate || project.startDate || new Date();

        const startDiff = Math.floor((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        return {
            left: startDiff * dayWidth,
            width: Math.max(MIN_BAR_WIDTH, duration * dayWidth - 4),
            hasValidDates: true,
        };
    }, [project.startDate, project.endDate, timelineStart, dayWidth]);

    useEffect(() => {
        setCurrentLeft(left);
        setCurrentWidth(width);
    }, [left, width]);

    const handleMouseDown = (e: React.MouseEvent, type: "move" | "resize-left" | "resize-right") => {
        if (project.deletedAt) return;
        e.preventDefault();
        e.stopPropagation();

        setIsDragging(true);
        setHasDragged(false);
        setDragType(type);
        setDragStartX(e.clientX);
        setOriginalLeft(currentLeft);
        setOriginalWidth(currentWidth);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            if (Math.abs(deltaX) > 3) setHasDragged(true);

            const daysDelta = Math.round(deltaX / dayWidth);

            if (dragType === "move") {
                const newLeft = originalLeft + daysDelta * dayWidth;
                setCurrentLeft(newLeft);
            } else if (dragType === "resize-left") {
                const newLeft = originalLeft + daysDelta * dayWidth;
                const newWidth = originalWidth - daysDelta * dayWidth;

                if (newWidth >= MIN_BAR_WIDTH) {
                    setCurrentLeft(newLeft);
                    setCurrentWidth(newWidth);
                }
            } else if (dragType === "resize-right") {
                const newWidth = originalWidth + daysDelta * dayWidth;
                if (newWidth >= MIN_BAR_WIDTH) setCurrentWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            const wasDragging = hasDragged;
            setIsDragging(false);
            setDragType(null);

            const daysDeltaLeft = Math.round((currentLeft - left) / dayWidth);
            const daysDeltaWidth = Math.round((currentWidth - width) / dayWidth);

            if (daysDeltaLeft !== 0 || daysDeltaWidth !== 0) {
                let newStartDate: Date | null = project.startDate ? new Date(project.startDate) : null;
                let newEndDate: Date | null = project.endDate ? new Date(project.endDate) : null;

                if (dragType === "move" && newStartDate && newEndDate) {
                    newStartDate.setDate(newStartDate.getDate() + daysDeltaLeft);
                    newEndDate.setDate(newEndDate.getDate() + daysDeltaLeft);
                } else if (dragType === "resize-left" && newStartDate) {
                    newStartDate.setDate(newStartDate.getDate() + daysDeltaLeft);
                } else if (dragType === "resize-right" && newEndDate) {
                    newEndDate.setDate(newEndDate.getDate() + daysDeltaWidth);
                }

                onDateChange(project.id, newStartDate, newEndDate);
            } else {
                setCurrentLeft(left);
                setCurrentWidth(width);
                if (!wasDragging) onProjectClick(project);
            }

            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragType, dragStartX, originalLeft, originalWidth, currentLeft, currentWidth, left, width, project, onDateChange, onProjectClick, hasDragged, dayWidth]);

    if (!hasValidDates) {
        return (
            <div
                className="absolute flex items-center px-2 text-muted-foreground italic cursor-pointer hover:text-foreground h-[32px] text-sm"
                style={{ top: 4, left: 4 }}
                onClick={() => onProjectClick(project)}
            >
                <span className="truncate">{project.name || "Untitled"}</span>
                <span className="ml-1 text-muted-foreground/60">(no dates)</span>
            </div>
        );
    }

    return (
        <div
            ref={barRef}
            className={cn(
                "absolute flex items-center rounded-md cursor-pointer transition-shadow group",
                isDragging && "shadow-lg z-10",
                project.deletedAt && "opacity-50"
            )}
            style={{
                left: currentLeft,
                width: currentWidth,
                height: PROJECT_BAR_HEIGHT,
                top: (ROW_HEIGHT - PROJECT_BAR_HEIGHT) / 2,
                backgroundColor: PROJECT_BAR_COLOR,
                borderLeft: `4px solid ${statusColors.bg}`,
            }}
        >
            <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20"
                onMouseDown={(e) => handleMouseDown(e, "resize-left")}
            />

            <div
                className="flex-1 flex items-center px-2 overflow-visible cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleMouseDown(e, "move")}
            >
                <span
                    className="font-medium text-white whitespace-nowrap text-sm"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                >
                    {project.name || "Untitled"}
                </span>
            </div>

            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20"
                onMouseDown={(e) => handleMouseDown(e, "resize-right")}
            />
        </div>
    );
}

export function MultiProjectProTimelineView({ projectIds, projects }: MultiProjectProTimelineViewProps) {
    const { setProjects } = useProjectStore();
    const { openProjectTab } = useProjectTabHelper();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();

    const [isLoading, setIsLoading] = useState(false);

    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
    const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
    const [isTodayVisible, setIsTodayVisible] = useState(true);
    const [hasScrolledToToday, setHasScrolledToToday] = useState(false);

    const [dayWidth, setDayWidth] = useState(() => {
        const stored = storageService.get<number>(STORAGE_KEY_ZOOM);
        return stored && stored >= MIN_DAY_WIDTH && stored <= MAX_DAY_WIDTH ? stored : DEFAULT_DAY_WIDTH;
    });

    useEffect(() => {
        storageService.set(STORAGE_KEY_ZOOM, dayWidth);
    }, [dayWidth]);

    // Filter and sort projects
    const filteredProjects = useMemo(() => {
        return projects
            .filter((p) => !p.deletedAt)
            .sort((a, b) => {
                if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
                if (a.startDate) return -1;
                if (b.startDate) return 1;
                return (a.name || "").localeCompare(b.name || "");
            });
    }, [projects]);

    useEffect(() => {
        if (timelineRange) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let minDate = new Date(today);
        let maxDate = new Date(today);

        filteredProjects.forEach((project) => {
            if (project.startDate) {
                if (project.startDate < minDate) minDate = new Date(project.startDate);
                if (project.startDate > maxDate) maxDate = new Date(project.startDate);
            }
            if (project.endDate) {
                if (project.endDate < minDate) minDate = new Date(project.endDate);
                if (project.endDate > maxDate) maxDate = new Date(project.endDate);
            }
        });

        const start = new Date(minDate);
        start.setDate(start.getDate() - 14);
        start.setHours(0, 0, 0, 0);

        const end = new Date(maxDate);
        end.setDate(end.getDate() + 14);
        end.setHours(0, 0, 0, 0);

        const minRange = 60;
        const currentRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (currentRange < minRange) {
            const toAdd = Math.ceil((minRange - currentRange) / 2);
            start.setDate(start.getDate() - toAdd);
            end.setDate(end.getDate() + toAdd);
        }

        setTimelineRange({ start, end });
    }, [filteredProjects, timelineRange]);

    const { timelineStart, dates } = useMemo(() => {
        if (!timelineRange) return { timelineStart: new Date(), dates: [] };
        return { timelineStart: timelineRange.start, dates: generateDateRange(timelineRange.start, timelineRange.end) };
    }, [timelineRange]);

    const todayPosition = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays * dayWidth + dayWidth / 2;
    }, [timelineStart, dayWidth]);

    useEffect(() => {
        if (!hasScrolledToToday && timelineScrollRef.current && timelineRange) {
            const clientWidth = timelineScrollRef.current.clientWidth;
            timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday, todayPosition, timelineRange]);

    const checkTodayVisibility = useCallback(() => {
        if (!timelineScrollRef.current) return;
        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        setIsTodayVisible(todayPosition >= scrollLeft && todayPosition <= scrollLeft + clientWidth);
    }, [todayPosition]);

    const handleScroll = useCallback(() => {
        if (!timelineScrollRef.current || !timelineRange) return;
        const { scrollLeft, scrollWidth, clientWidth } = timelineScrollRef.current;
        checkTodayVisibility();

        if (scrollLeft < 100) {
            const newStart = new Date(timelineRange.start);
            newStart.setDate(newStart.getDate() - EXTEND_DAYS);
            setTimelineRange((prev) => (prev ? { ...prev, start: newStart } : null));
            setTimeout(() => {
                if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = scrollLeft + EXTEND_DAYS * dayWidth;
            }, 0);
        }

        if (scrollLeft + clientWidth > scrollWidth - 100) {
            const newEnd = new Date(timelineRange.end);
            newEnd.setDate(newEnd.getDate() + EXTEND_DAYS);
            setTimelineRange((prev) => (prev ? { ...prev, end: newEnd } : null));
        }
    }, [timelineRange, dayWidth, checkTodayVisibility]);

    const scrollToToday = useCallback(() => {
        if (!timelineScrollRef.current) return;
        timelineScrollRef.current.scrollLeft = todayPosition - timelineScrollRef.current.clientWidth / 2;
    }, [todayPosition]);

    const handleZoom = useCallback(
        (newDayWidth: number) => {
            if (!timelineScrollRef.current) {
                setDayWidth(newDayWidth);
                return;
            }

            const { scrollLeft, clientWidth } = timelineScrollRef.current;
            const centerDay = (scrollLeft + clientWidth / 2) / dayWidth;

            setDayWidth(newDayWidth);

            setTimeout(() => {
                if (timelineScrollRef.current) {
                    timelineScrollRef.current.scrollLeft = centerDay * newDayWidth - clientWidth / 2;
                }
            }, 0);
        },
        [dayWidth]
    );

    const handleZoomIn = useCallback(() => handleZoom(Math.min(dayWidth + ZOOM_STEP, MAX_DAY_WIDTH)), [dayWidth, handleZoom]);
    const handleZoomOut = useCallback(() => handleZoom(Math.max(dayWidth - ZOOM_STEP, MIN_DAY_WIDTH)), [dayWidth, handleZoom]);

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

    const handleDateChange = useCallback(
        async (projectId: number, startDate: Date | null, endDate: Date | null) => {
            const project = filteredProjects.find((p) => p.id === projectId);
            if (!project) return;

            try {
                setIsLoading(true);

                const upsertData = {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    status: project.status,
                    startDate: toLocalISOString(startDate),
                    endDate: toLocalISOString(endDate),
                };

                const result = await projectService._upsertProjectBatch($user.userToken, [upsertData]);

                if (result.success) {
                    // Update local state
                    setProjects((prev) =>
                        prev.map((p) =>
                            p.id === projectId
                                ? { ...p, startDate, endDate }
                                : p
                        )
                    );
                    _console.success("Project dates updated");
                }
            } catch (error) {
                console.error("Failed to update project dates:", error);
                _console.error("Failed to update project dates");
            } finally {
                setIsLoading(false);
            }
        },
        [filteredProjects, $user.userToken, setProjects, _console]
    );

    useEffect(() => {
        checkTodayVisibility();
    }, [checkTodayVisibility, dayWidth]);

    const timelineWidth = dates.length * dayWidth;
    const totalHeight = Math.max(filteredProjects.length * ROW_HEIGHT, 200);

    return (
        <div className="w-full h-full flex flex-col relative">
            {isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            <div className="flex-1 overflow-hidden flex">
                {/* Project List (Left Panel) */}
                <div className="w-[250px] flex-shrink-0 border-r bg-muted/30">
                    <div className="border-b bg-muted/50 flex items-center px-3 font-medium text-sm" style={{ height: HEADER_HEIGHT }}>
                        Projects
                    </div>

                    <ScrollArea className="h-[calc(100%-60px)]">
                        {filteredProjects.map((project) => {
                            const statusColors = getProjectStatusColors(project.status || "");
                            return (
                                <div
                                    key={project.id}
                                    className={cn(
                                        "flex items-center gap-2 cursor-pointer border-b border-transparent px-3",
                                        hoveredProjectId === project.id && "bg-muted/50"
                                    )}
                                    style={{ height: ROW_HEIGHT }}
                                    onClick={() => openProjectTab(project)}
                                    onMouseEnter={() => setHoveredProjectId(project.id)}
                                    onMouseLeave={() => setHoveredProjectId(null)}
                                >
                                    {/* Status dot */}
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: statusColors.bg }}
                                    />
                                    <span className="truncate text-sm">
                                        {project.name || "Untitled"}
                                    </span>
                                </div>
                            );
                        })}
                        {filteredProjects.length === 0 && (
                            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No projects</div>
                        )}
                    </ScrollArea>
                </div>

                {/* Timeline Grid (Right Panel) */}
                <div ref={timelineScrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
                    <div style={{ width: timelineWidth, minHeight: "100%" }} className="relative">
                        {/* Today line */}
                        <div
                            className="absolute w-[1px] bg-red-500 z-[5] pointer-events-none"
                            style={{ left: todayPosition, top: 0, bottom: 0, height: HEADER_HEIGHT + totalHeight }}
                        >
                            <div
                                className="absolute -top-0 -left-[5px] w-0 h-0"
                                style={{
                                    borderLeft: "6px solid transparent",
                                    borderRight: "6px solid transparent",
                                    borderTop: "8px solid rgb(239 68 68)",
                                }}
                            />
                        </div>

                        {/* Timeline Header */}
                        <div className="sticky top-0 z-10 bg-background border-b" style={{ height: HEADER_HEIGHT }}>
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
                                        style={{ width: dayWidth, background: isWeekend(date) && !isToday(date) ? WEEKEND_STRIPE_BG : undefined }}
                                    >
                                        {formatDateHeader(date)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grid lines */}
                        <div className="absolute left-0 right-0 flex pointer-events-none" style={{ top: HEADER_HEIGHT, height: totalHeight }}>
                            {dates.map((date, index) => (
                                <div
                                    key={index}
                                    className="h-full"
                                    style={{
                                        width: dayWidth,
                                        borderRight: isFirstDayOfMonth(date) ? "1px solid hsl(var(--border))" : "1px dashed hsl(var(--border) / 0.5)",
                                        background: isWeekend(date) ? WEEKEND_STRIPE_BG : undefined,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Timeline Rows */}
                        <div style={{ position: "relative" }}>
                            {filteredProjects.map((project) => {
                                return (
                                    <div
                                        key={project.id}
                                        className={cn(
                                            "relative",
                                            hoveredProjectId === project.id && "bg-muted/40"
                                        )}
                                        style={{ height: ROW_HEIGHT }}
                                        onMouseEnter={() => setHoveredProjectId(project.id)}
                                        onMouseLeave={() => setHoveredProjectId(null)}
                                    >
                                        <ProjectBar
                                            project={project}
                                            timelineStart={timelineStart}
                                            dayWidth={dayWidth}
                                            onDateChange={handleDateChange}
                                            onProjectClick={openProjectTab}
                                        />
                                    </div>
                                );
                            })}

                            {filteredProjects.length === 0 && (
                                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No projects with dates</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
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
                                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={dayWidth <= MIN_DAY_WIDTH} className="h-7 w-7 p-0">
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zoom out</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <span className="text-xs text-muted-foreground w-8 text-center">{Math.round((dayWidth / DEFAULT_DAY_WIDTH) * 100)}%</span>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={dayWidth >= MAX_DAY_WIDTH} className="h-7 w-7 p-0">
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
