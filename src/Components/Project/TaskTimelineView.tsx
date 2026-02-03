/**
 * TaskTimelineView - Timeline/Gantt Chart Component
 * Displays tasks on a timeline with draggable start/end dates
 * Day view only with zoom controls
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { Loader2, ZoomIn, ZoomOut, Calendar, CornerDownRight } from "lucide-react";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { useTaskGridHelper } from "@/hooks/task/useTaskGrid.helper";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { useAuthStore } from "@/store/index";
import { taskService } from "@/services/task.service";
import { storageService } from "@/services/storage.service";
import { cn } from "@/lib/utils";
import { constants } from "@/utils/constants";
import { toLocalISOString } from "@/utils/date.utils";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { useProjectStore } from "@/store/project/useProject.store";

interface TaskTimelineViewProps {
    projectId: number;
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

// Task bar color
const TASK_BAR_COLOR = "#24366E";
const SUBTASK_BAR_COLOR = "#6e7681";
const SUBTASK_BAR_HEIGHT = 20;

// Weekend stripe pattern (45 degree diagonal lines)
const WEEKEND_STRIPE_BG = `repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    hsl(var(--muted-foreground) / 0.15) 3px,
    hsl(var(--muted-foreground) / 0.15) 6px
)`;

/**
 * Get task status colors from constants
 */
const getTaskStatusColors = (status: string) => {
    const colors = constants.optionColor.taskStatus.colors[status];
    return colors || constants.optionColor.taskStatus.default;
};

/**
 * Generate date range for timeline
 */
function generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Format date for header - "Mo 20", "Tu 21"
 */
function formatDateHeader(date: Date): string {
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const dayOfWeek = dayNames[date.getDay()];
    const dayOfMonth = date.getDate();
    return `${dayOfWeek} ${dayOfMonth}`;
}

/**
 * Format month for header
 */
function formatMonthHeader(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
    }).format(date);
}

/**
 * Check if date is weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if date is today
 */
function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

/**
 * Check if date is first day of month
 */
function isFirstDayOfMonth(date: Date): boolean {
    return date.getDate() === 1;
}

/**
 * Draggable Task Bar
 */
interface TaskBarProps {
    task: Task;
    timelineStart: Date;
    dayWidth: number;
    onDateChange: (taskId: number, startDate: Date | null, endDate: Date | null) => void;
    onTaskClick: (task: Task) => void;
    isSubtask?: boolean;
    parentTask?: Task | null;
    project?: { startDate?: Date | null; endDate?: Date | null } | null;
    allTasks?: Task[];
    onValidationError?: (message: string) => void;
}

function TaskBar({ task, timelineStart, dayWidth, onDateChange, onTaskClick, isSubtask = false, parentTask, project, allTasks = [], onValidationError }: TaskBarProps) {
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

    // Calculate position based on dates
    const { left, width, hasValidDates } = useMemo(() => {
        if (!task.startDate && !task.endDate) {
            return { left: 0, width: MIN_BAR_WIDTH, hasValidDates: false };
        }

        const start = task.startDate || task.endDate || new Date();
        const end = task.endDate || task.startDate || new Date();

        const startDiff = Math.floor(
            (start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        const duration = Math.max(
            1,
            Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        return {
            left: startDiff * dayWidth,
            width: Math.max(MIN_BAR_WIDTH, duration * dayWidth - 4),
            hasValidDates: true,
        };
    }, [task.startDate, task.endDate, timelineStart, dayWidth]);

    // Initialize current position
    useEffect(() => {
        setCurrentLeft(left);
        setCurrentWidth(width);
    }, [left, width]);

    // Handle mouse down for drag
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

    // Calculate constraint boundaries (in pixels from timeline start)
    // For subtasks: constrained by parent task dates
    // For tasks: constrained by project dates only (warning shown if subtasks fall outside)
    const constraintBounds = useMemo(() => {
        let outerMinDate: Date | null = null;
        let outerMaxDate: Date | null = null;

        if (isSubtask && parentTask) {
            // Subtask: bounds from parent task
            outerMinDate = parentTask.startDate || null;
            outerMaxDate = parentTask.endDate || null;
        } else {
            // Task: bounds from project only
            if (project) {
                outerMinDate = project.startDate || null;
                outerMaxDate = project.endDate || null;
            }
        }

        // Convert outer dates to pixel positions
        const minLeft = outerMinDate
            ? Math.floor((outerMinDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth
            : null;
        const maxRight = outerMaxDate
            ? (Math.floor((outerMaxDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)) + 1) * dayWidth
            : null;

        return { minLeft, maxRight };
    }, [isSubtask, parentTask, project, timelineStart, dayWidth]);

    // Check if any subtasks fall outside a given date range
    const getSubtasksOutsideRange = useCallback(
        (newStartDate: Date | null, newEndDate: Date | null): string[] => {
            if (isSubtask) return []; // Subtasks don't have subtasks

            const subtasks = allTasks.filter((t) => t.parentTaskId === task.id);
            const outsideSubtasks: string[] = [];

            subtasks.forEach((subtask) => {
                let isOutside = false;
                if (newStartDate && subtask.startDate && subtask.startDate < newStartDate) {
                    isOutside = true;
                }
                if (newEndDate && subtask.endDate && subtask.endDate > newEndDate) {
                    isOutside = true;
                }
                if (isOutside) {
                    outsideSubtasks.push(subtask.title || `Subtask #${subtask.id}`);
                }
            });

            return outsideSubtasks;
        },
        [isSubtask, allTasks, task.id]
    );

    // Handle mouse move
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;

            // Mark as dragged if moved more than 3 pixels
            if (Math.abs(deltaX) > 3) {
                setHasDragged(true);
            }

            const daysDelta = Math.round(deltaX / dayWidth);

            if (dragType === "move") {
                let newLeft = originalLeft + daysDelta * dayWidth;
                let newRight = newLeft + originalWidth;

                // Apply outer constraints for move (project bounds)
                if (constraintBounds.minLeft !== null && newLeft < constraintBounds.minLeft) {
                    newLeft = constraintBounds.minLeft;
                }
                if (constraintBounds.maxRight !== null && newRight > constraintBounds.maxRight) {
                    newLeft = constraintBounds.maxRight - originalWidth;
                }

                setCurrentLeft(newLeft);
            } else if (dragType === "resize-left") {
                let newLeft = originalLeft + daysDelta * dayWidth;
                let newWidth = originalWidth - daysDelta * dayWidth;

                // Apply outer constraint (cannot go before project/parent start)
                if (constraintBounds.minLeft !== null && newLeft < constraintBounds.minLeft) {
                    const adjustment = constraintBounds.minLeft - newLeft;
                    newLeft = constraintBounds.minLeft;
                    newWidth = newWidth - adjustment;
                }

                if (newWidth >= MIN_BAR_WIDTH) {
                    setCurrentLeft(newLeft);
                    setCurrentWidth(newWidth);
                }
            } else if (dragType === "resize-right") {
                let newWidth = originalWidth + daysDelta * dayWidth;
                const newRight = currentLeft + newWidth;

                // Apply outer constraint (cannot go after project/parent end)
                if (constraintBounds.maxRight !== null && newRight > constraintBounds.maxRight) {
                    newWidth = constraintBounds.maxRight - currentLeft;
                }

                if (newWidth >= MIN_BAR_WIDTH) {
                    setCurrentWidth(newWidth);
                }
            }
        };

        const handleMouseUp = () => {
            const wasDragging = hasDragged;
            setIsDragging(false);
            setDragType(null);

            // Calculate new dates
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

                // Check if any subtasks fall outside the new range and warn
                if (!isSubtask) {
                    const outsideSubtasks = getSubtasksOutsideRange(newStartDate, newEndDate);
                    if (outsideSubtasks.length > 0 && onValidationError) {
                        onValidationError(
                            `Warning: ${outsideSubtasks.length} subtask(s) fall outside the new date range: ${outsideSubtasks.join(", ")}. Please update them manually.`
                        );
                    }
                }

                onDateChange(task.id, newStartDate, newEndDate);
            } else {
                // Reset to original position if no change
                setCurrentLeft(left);
                setCurrentWidth(width);

                // Only trigger click if we didn't drag
                if (!wasDragging) {
                    onTaskClick(task);
                }
            }

            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragType, dragStartX, originalLeft, originalWidth, currentLeft, currentWidth, left, width, task, onDateChange, onTaskClick, hasDragged, dayWidth, isSubtask, getSubtasksOutsideRange, onValidationError]);

    // Subtask-specific dimensions
    const barHeight = isSubtask ? SUBTASK_BAR_HEIGHT : TASK_BAR_HEIGHT;
    const barColor = isSubtask ? SUBTASK_BAR_COLOR : TASK_BAR_COLOR;

    if (!hasValidDates) {
        // Show a placeholder for tasks without dates
        return (
            <div
                className={cn(
                    "absolute flex items-center px-2 text-muted-foreground italic cursor-pointer hover:text-foreground",
                    isSubtask ? "h-[20px] text-[10px]" : "h-[28px] text-xs"
                )}
                style={{ top: 4, left: isSubtask ? 20 : 4 }}
                onClick={() => onTaskClick(task)}
            >
                {isSubtask && <CornerDownRight className="h-2.5 w-2.5 mr-1 flex-shrink-0" />}
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
                height: barHeight,
                top: (ROW_HEIGHT - barHeight) / 2,
                backgroundColor: barColor,
                borderLeft: `3px solid ${statusColors.bg}`,
            }}
        >
            {/* Left resize handle */}
            <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20"
                onMouseDown={(e) => handleMouseDown(e, "resize-left")}
            />

            {/* Task content - can overflow */}
            <div
                className="flex-1 flex items-center px-2 overflow-visible cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleMouseDown(e, "move")}
            >
                {isSubtask && <CornerDownRight className="h-2.5 w-2.5 mr-1 text-white/70 flex-shrink-0" />}
                <span
                    className={cn("font-medium text-white whitespace-nowrap", isSubtask ? "text-[10px]" : "text-xs")}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                >
                    {task.title || "Untitled"}
                </span>
            </div>

            {/* Right resize handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20"
                onMouseDown={(e) => handleMouseDown(e, "resize-right")}
            />
        </div>
    );
}

/**
 * TaskTimelineView - Main Timeline Component
 */
export function TaskTimelineView({ projectId }: TaskTimelineViewProps) {
    const { tasks, taskGridIsLoading, setTaskGridIsLoading, taskGridError } = useTaskStore();
    const { loadTasks } = useTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { $user } = useAuthStore();
    const { projects } = useProjectStore();
    const _console = useConsoleHelper();

    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
    const [isTodayVisible, setIsTodayVisible] = useState(true);
    const [hasScrolledToToday, setHasScrolledToToday] = useState(false);

    // Load day width from localStorage
    const [dayWidth, setDayWidth] = useState(() => {
        const stored = storageService.get<number>(STORAGE_KEY_ZOOM);
        return stored && stored >= MIN_DAY_WIDTH && stored <= MAX_DAY_WIDTH ? stored : DEFAULT_DAY_WIDTH;
    });

    // Save day width to localStorage when changed
    useEffect(() => {
        storageService.set(STORAGE_KEY_ZOOM, dayWidth);
    }, [dayWidth]);

    // Get current project
    const currentProject = useMemo(() => {
        return projects.find((p) => p.id === projectId);
    }, [projects, projectId]);

    // Filter tasks by projectId and sort with subtasks under parents
    const filteredTasks = useMemo(() => {
        const projectTasks = tasks.filter((task) => task.projectId === projectId && !task.deletedAt);

        // Separate parent tasks and subtasks
        const parentTasks = projectTasks.filter((t) => !t.parentTaskId);
        const subtasks = projectTasks.filter((t) => t.parentTaskId);

        // Sort parent tasks by startDate
        parentTasks.sort((a, b) => {
            if (a.startDate && b.startDate) {
                return a.startDate.getTime() - b.startDate.getTime();
            }
            if (a.startDate) return -1;
            if (b.startDate) return 1;
            return (a.title || "").localeCompare(b.title || "");
        });

        // Build result with subtasks after their parents
        const result: Task[] = [];
        parentTasks.forEach((parent) => {
            result.push(parent);
            const childTasks = subtasks
                .filter((s) => s.parentTaskId === parent.id)
                .sort((a, b) => {
                    if (a.startDate && b.startDate) {
                        return a.startDate.getTime() - b.startDate.getTime();
                    }
                    if (a.startDate) return -1;
                    if (b.startDate) return 1;
                    return (a.title || "").localeCompare(b.title || "");
                });
            result.push(...childTasks);
        });

        // Add orphaned subtasks at the end
        const usedSubtaskIds = new Set(result.filter((t) => t.parentTaskId).map((t) => t.id));
        const orphanedSubtasks = subtasks.filter((s) => !usedSubtaskIds.has(s.id));
        result.push(...orphanedSubtasks);

        return result;
    }, [tasks, projectId]);

    // Initialize timeline range
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

    // Calculate dates from range
    const { timelineStart, dates } = useMemo(() => {
        if (!timelineRange) {
            return { timelineStart: new Date(), dates: [] };
        }
        const allDates = generateDateRange(timelineRange.start, timelineRange.end);
        return {
            timelineStart: timelineRange.start,
            dates: allDates,
        };
    }, [timelineRange]);

    // Calculate today line position
    const todayPosition = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays * dayWidth + dayWidth / 2;
    }, [timelineStart, dayWidth]);

    // Scroll to today on initial load
    useEffect(() => {
        if (!hasScrolledToToday && timelineScrollRef.current && timelineRange) {
            const clientWidth = timelineScrollRef.current.clientWidth;
            timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday, todayPosition, timelineRange]);

    // Check if today is visible
    const checkTodayVisibility = useCallback(() => {
        if (!timelineScrollRef.current) return;
        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        const isVisible = todayPosition >= scrollLeft && todayPosition <= scrollLeft + clientWidth;
        setIsTodayVisible(isVisible);
    }, [todayPosition]);

    // Handle scroll to extend timeline and check today visibility
    const handleScroll = useCallback(() => {
        if (!timelineScrollRef.current || !timelineRange) return;

        const { scrollLeft, scrollWidth, clientWidth } = timelineScrollRef.current;

        checkTodayVisibility();

        if (scrollLeft < 100) {
            const newStart = new Date(timelineRange.start);
            newStart.setDate(newStart.getDate() - EXTEND_DAYS);
            setTimelineRange(prev => prev ? { ...prev, start: newStart } : null);

            setTimeout(() => {
                if (timelineScrollRef.current) {
                    timelineScrollRef.current.scrollLeft = scrollLeft + EXTEND_DAYS * dayWidth;
                }
            }, 0);
        }

        if (scrollLeft + clientWidth > scrollWidth - 100) {
            const newEnd = new Date(timelineRange.end);
            newEnd.setDate(newEnd.getDate() + EXTEND_DAYS);
            setTimelineRange(prev => prev ? { ...prev, end: newEnd } : null);
        }
    }, [timelineRange, dayWidth, checkTodayVisibility]);

    // Scroll to today
    const scrollToToday = useCallback(() => {
        if (!timelineScrollRef.current) return;
        const clientWidth = timelineScrollRef.current.clientWidth;
        timelineScrollRef.current.scrollLeft = todayPosition - clientWidth / 2;
    }, [todayPosition]);

    // Zoom handlers - maintain center point
    const handleZoom = useCallback((newDayWidth: number) => {
        if (!timelineScrollRef.current) {
            setDayWidth(newDayWidth);
            return;
        }

        const { scrollLeft, clientWidth } = timelineScrollRef.current;
        const centerX = scrollLeft + clientWidth / 2;
        const centerDay = centerX / dayWidth;

        setDayWidth(newDayWidth);

        // Restore center position after state update
        setTimeout(() => {
            if (timelineScrollRef.current) {
                const newCenterX = centerDay * newDayWidth;
                timelineScrollRef.current.scrollLeft = newCenterX - clientWidth / 2;
            }
        }, 0);
    }, [dayWidth]);

    const handleZoomIn = useCallback(() => {
        handleZoom(Math.min(dayWidth + ZOOM_STEP, MAX_DAY_WIDTH));
    }, [dayWidth, handleZoom]);

    const handleZoomOut = useCallback(() => {
        handleZoom(Math.max(dayWidth - ZOOM_STEP, MIN_DAY_WIDTH));
    }, [dayWidth, handleZoom]);

    // Group dates by month for header
    const monthGroups = useMemo(() => {
        const groups: { month: string; days: number; startIndex: number }[] = [];
        let currentMonth = "";
        let currentCount = 0;
        let startIndex = 0;

        dates.forEach((date, index) => {
            const month = formatMonthHeader(date);
            if (month !== currentMonth) {
                if (currentMonth) {
                    groups.push({ month: currentMonth, days: currentCount, startIndex });
                }
                currentMonth = month;
                currentCount = 1;
                startIndex = index;
            } else {
                currentCount++;
            }
        });

        if (currentMonth) {
            groups.push({ month: currentMonth, days: currentCount, startIndex });
        }

        return groups;
    }, [dates]);

    // Handle date change from drag with validation
    const handleDateChange = useCallback(
        async (taskId: number, startDate: Date | null, endDate: Date | null) => {
            const task = filteredTasks.find((t) => t.id === taskId);
            if (!task) return;

            // Validate subtask date constraints (must be within parent task dates)
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

            // Validate task date constraints (must be within project dates)
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

                if (result.success) {
                    await loadTasks(projectId);
                }
            } catch (error) {
                console.error("Failed to update task dates:", error);
                await loadTasks(projectId);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [filteredTasks, currentProject, $user.userToken, loadTasks, projectId, setTaskGridIsLoading, _console]
    );

    // Load tasks on mount
    useEffect(() => {
        if ($user.userId) {
            loadTasks(projectId);
        }
    }, [$user.userId, projectId]);

    // Check today visibility on mount and when dayWidth changes
    useEffect(() => {
        checkTodayVisibility();
    }, [checkTodayVisibility, dayWidth]);

    const timelineWidth = dates.length * dayWidth;
    const totalHeight = Math.max(filteredTasks.length * ROW_HEIGHT, 200);

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
                        style={{ height: HEADER_HEIGHT }}
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
                                    style={{ height: ROW_HEIGHT }}
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
                                height: HEADER_HEIGHT + totalHeight,
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
                            style={{ top: HEADER_HEIGHT, height: totalHeight }}
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
                                        style={{ height: ROW_HEIGHT }}
                                        onMouseEnter={() => setHoveredTaskId(task.id)}
                                        onMouseLeave={() => setHoveredTaskId(null)}
                                    >
                                        {/* Task Bar */}
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
