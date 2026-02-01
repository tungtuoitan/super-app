/**
 * MultiProjectTimelineView - Timeline/Gantt Chart for Multiple Projects
 * Displays tasks from multiple projects on a timeline
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { Loader2, ZoomIn, ZoomOut, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { Project } from "@/store/project/useProject.store";
import { useMultiProjectTaskGridHelper } from "@/hooks/project/useMultiProjectTaskGrid.helper";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { useAuthStore } from "@/store/index";
import { taskService } from "@/services/task.service";
import { storageService } from "@/services/storage.service";
import { cn } from "@/lib/utils";
import { constants } from "@/utils/constants";
import { toLocalISOString } from "@/utils/date.utils";

interface MultiProjectTimelineViewProps {
    projectIds: number[];
    projects: Project[];
}

// Constants
const STORAGE_KEY_ZOOM = "timeline_day_width";
const DEFAULT_DAY_WIDTH = 40;
const MIN_DAY_WIDTH = 20;
const MAX_DAY_WIDTH = 80;
const ZOOM_STEP = 10;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 60;
const TASK_BAR_HEIGHT = 28;
const MIN_BAR_WIDTH = 20;
const EXTEND_DAYS = 14;
const TASK_BAR_COLOR = "#24366E";

const WEEKEND_STRIPE_BG = `repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    hsl(var(--muted-foreground) / 0.15) 3px,
    hsl(var(--muted-foreground) / 0.15) 6px
)`;

const getTaskStatusColors = (status: string) => {
    const colors = constants.optionColor.taskStatus.colors[status];
    return colors || constants.optionColor.taskStatus.default;
};

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

interface TaskBarProps {
    task: Task;
    timelineStart: Date;
    dayWidth: number;
    onDateChange: (taskId: number, startDate: Date | null, endDate: Date | null) => void;
    onTaskClick: (task: Task) => void;
}

function TaskBar({ task, timelineStart, dayWidth, onDateChange, onTaskClick }: TaskBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const [dragType, setDragType] = useState<"move" | "resize-left" | "resize-right" | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [originalLeft, setOriginalLeft] = useState(0);
    const [originalWidth, setOriginalWidth] = useState(0);
    const [currentLeft, setCurrentLeft] = useState(0);
    const [currentWidth, setCurrentWidth] = useState(0);

    const statusColors = getTaskStatusColors(task.status);

    const { left, width, hasValidDates } = useMemo(() => {
        if (!task.startDate && !task.endDate) {
            return { left: 0, width: MIN_BAR_WIDTH, hasValidDates: false };
        }

        const start = task.startDate || task.endDate || new Date();
        const end = task.endDate || task.startDate || new Date();

        const startDiff = Math.floor((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        return {
            left: startDiff * dayWidth,
            width: Math.max(MIN_BAR_WIDTH, duration * dayWidth - 4),
            hasValidDates: true,
        };
    }, [task.startDate, task.endDate, timelineStart, dayWidth]);

    useEffect(() => {
        setCurrentLeft(left);
        setCurrentWidth(width);
    }, [left, width]);

    const handleMouseDown = (e: React.MouseEvent, type: "move" | "resize-left" | "resize-right") => {
        if (task.deletedAt) return;
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
                setCurrentLeft(originalLeft + daysDelta * dayWidth);
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
                let newStartDate: Date | null = task.startDate ? new Date(task.startDate) : null;
                let newEndDate: Date | null = task.endDate ? new Date(task.endDate) : null;

                if (dragType === "move" && newStartDate && newEndDate) {
                    newStartDate.setDate(newStartDate.getDate() + daysDeltaLeft);
                    newEndDate.setDate(newEndDate.getDate() + daysDeltaLeft);
                } else if (dragType === "resize-left" && newStartDate) {
                    newStartDate.setDate(newStartDate.getDate() + daysDeltaLeft);
                } else if (dragType === "resize-right" && newEndDate) {
                    newEndDate.setDate(newEndDate.getDate() + daysDeltaWidth);
                }

                onDateChange(task.id, newStartDate, newEndDate);
            } else {
                setCurrentLeft(left);
                setCurrentWidth(width);
                if (!wasDragging) onTaskClick(task);
            }

            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragType, dragStartX, originalLeft, originalWidth, currentLeft, currentWidth, left, width, task, onDateChange, onTaskClick, hasDragged, dayWidth]);

    if (!hasValidDates) {
        return (
            <div
                className="absolute flex items-center h-[28px] px-2 text-xs text-muted-foreground italic cursor-pointer hover:text-foreground"
                style={{ top: 4, left: 4 }}
                onClick={() => onTaskClick(task)}
            >
                <span className="truncate">{task.title || "Untitled"}</span>
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
                task.deletedAt && "opacity-50"
            )}
            style={{
                left: currentLeft,
                width: currentWidth,
                height: TASK_BAR_HEIGHT,
                top: (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2,
                backgroundColor: TASK_BAR_COLOR,
                borderLeft: `3px solid ${statusColors.bg}`,
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
                <span className="text-xs font-medium text-white whitespace-nowrap" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {task.title || "Untitled"}
                </span>
            </div>

            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20"
                onMouseDown={(e) => handleMouseDown(e, "resize-right")}
            />
        </div>
    );
}

export function MultiProjectTimelineView({ projectIds, projects }: MultiProjectTimelineViewProps) {
    const { tasks, taskGridIsLoading, setTaskGridIsLoading, taskGridError } = useTaskStore();
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { $user } = useAuthStore();

    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
    const [isTodayVisible, setIsTodayVisible] = useState(true);
    const [hasScrolledToToday, setHasScrolledToToday] = useState(false);

    const [dayWidth, setDayWidth] = useState(() => {
        const stored = storageService.get<number>(STORAGE_KEY_ZOOM);
        return stored && stored >= MIN_DAY_WIDTH && stored <= MAX_DAY_WIDTH ? stored : DEFAULT_DAY_WIDTH;
    });

    useEffect(() => {
        storageService.set(STORAGE_KEY_ZOOM, dayWidth);
    }, [dayWidth]);

    const filteredTasks = useMemo(() => {
        return tasks
            .filter((task) => projectIds.includes(task.projectId) && !task.deletedAt)
            .sort((a, b) => {
                if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
                if (a.startDate) return -1;
                if (b.startDate) return 1;
                return (a.title || "").localeCompare(b.title || "");
            });
    }, [tasks, projectIds]);

    useEffect(() => {
        if (timelineRange) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let minDate = new Date(today);
        let maxDate = new Date(today);

        filteredTasks.forEach((task) => {
            if (task.startDate) {
                if (task.startDate < minDate) minDate = new Date(task.startDate);
                if (task.startDate > maxDate) maxDate = new Date(task.startDate);
            }
            if (task.endDate) {
                if (task.endDate < minDate) minDate = new Date(task.endDate);
                if (task.endDate > maxDate) maxDate = new Date(task.endDate);
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
    }, [filteredTasks, timelineRange]);

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
        async (taskId: number, startDate: Date | null, endDate: Date | null) => {
            const task = filteredTasks.find((t) => t.id === taskId);
            if (!task) return;

            try {
                setTaskGridIsLoading(true);

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
                };

                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) await loadTasksForProjects(projectIds);
            } catch (error) {
                console.error("Failed to update task dates:", error);
                await loadTasksForProjects(projectIds);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [filteredTasks, $user.userToken, loadTasksForProjects, projectIds, setTaskGridIsLoading]
    );

    useEffect(() => {
        if ($user.userId && projectIds.length > 0) loadTasksForProjects(projectIds);
    }, [$user.userId, projectIds]);

    useEffect(() => {
        checkTodayVisibility();
    }, [checkTodayVisibility, dayWidth]);

    const timelineWidth = dates.length * dayWidth;
    const totalHeight = Math.max(filteredTasks.length * ROW_HEIGHT, 200);

    return (
        <div className="w-full h-full flex flex-col relative">
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {taskGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load tasks</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="flex-1 overflow-hidden flex">
                {/* Task List (Left Panel) */}
                <div className="w-[250px] flex-shrink-0 border-r bg-muted/30">
                    <div className="border-b bg-muted/50 flex items-center px-3 font-medium text-sm" style={{ height: HEADER_HEIGHT }}>
                        Tasks
                    </div>

                    <ScrollArea className="h-[calc(100%-60px)]">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className={cn(
                                    "flex items-center px-3 cursor-pointer border-b border-transparent",
                                    hoveredTaskId === task.id && "bg-muted/50"
                                )}
                                style={{ height: ROW_HEIGHT }}
                                onClick={() => openTaskTab(task)}
                                onMouseEnter={() => setHoveredTaskId(task.id)}
                                onMouseLeave={() => setHoveredTaskId(null)}
                            >
                                <span className="text-sm truncate">{task.title || "Untitled"}</span>
                            </div>
                        ))}
                        {filteredTasks.length === 0 && (
                            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No tasks</div>
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
                            {filteredTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={cn("relative", hoveredTaskId === task.id && "bg-muted/40")}
                                    style={{ height: ROW_HEIGHT }}
                                    onMouseEnter={() => setHoveredTaskId(task.id)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                >
                                    <TaskBar
                                        task={task}
                                        timelineStart={timelineStart}
                                        dayWidth={dayWidth}
                                        onDateChange={handleDateChange}
                                        onTaskClick={openTaskTab}
                                    />
                                </div>
                            ))}

                            {filteredTasks.length === 0 && (
                                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No tasks with dates</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} from {projects.length} project
                    {projects.length !== 1 ? "s" : ""}
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
