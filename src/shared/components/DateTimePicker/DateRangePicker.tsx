/**
 * DateRangePicker Component
 * A date range picker combining start and end date into a single field
 * Click on Start/End in the field to toggle selection mode
 * Calendar always shows range with green (start) and red (end) colors
 */

import React, { useState, useEffect, useMemo } from "react";
import { format, isToday, isTomorrow, isSameWeek, addWeeks, isSameYear, startOfWeek, endOfWeek, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { Calendar } from "@/Components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Label } from "@/Components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import type { Matcher, DateRange } from "react-day-picker";

type SelectionMode = "start" | "end";

interface DateRangePickerProps {
    startDate: Date | null | undefined;
    endDate: Date | null | undefined;
    onStartDateChange: (date: Date | null) => void;
    onEndDateChange: (date: Date | null) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    showTime?: boolean;
    minDate?: Date | null;
    maxDate?: Date | null;
    disabledReason?: string;
}

/**
 * Format date to smart relative display (same as DateTimePicker)
 */
function formatSmartDate(date: Date, hasTime: boolean): string {
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let dateStr = "";

    if (isToday(date)) {
        dateStr = "Today";
    } else if (isTomorrow(date)) {
        dateStr = "Tomorrow";
    } else if (isSameWeek(date, now, { weekStartsOn: 1 })) {
        dateStr = dayNames[date.getDay()];
    } else {
        const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

        if (date >= nextWeekStart && date <= nextWeekEnd) {
            dateStr = `Next ${dayNames[date.getDay()]}`;
        } else if (isSameYear(date, now)) {
            dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
        } else {
            dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }
    }

    if (hasTime) {
        const timeStr = format(date, "H:mm");
        dateStr = `${dateStr}, ${timeStr}`;
    }

    return dateStr;
}

// Quick date options for single date selection
const QUICK_DATE_OPTIONS = [
    { label: "Today", getValue: () => new Date() },
    { label: "Tomorrow", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
    }},
    { label: "In 3 days", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d;
    }},
    { label: "In 1 week", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
    }},
    { label: "In 2 weeks", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
    }},
    { label: "In 1 month", getValue: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d;
    }},
];

export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    label,
    placeholder = "Pick dates",
    disabled = false,
    className,
    showTime = false,
    minDate,
    maxDate,
    disabledReason,
}: DateRangePickerProps) {
    const [open, setOpenState] = useState(false);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("start");

    // Use ref to track if we should keep open (to handle race conditions)
    const keepOpenRef = React.useRef(false);

    // Debug wrapper for setOpen
    const setOpen = (value: boolean) => {
        // console.log("[DateRangePicker] setOpen called:", value, "keepOpenRef:", keepOpenRef.current);
        if (!value && keepOpenRef.current) {
            // console.log("[DateRangePicker] Blocked close due to keepOpenRef");
            return; // Block close if we're in the middle of selecting
        }
        setOpenState(value);
    };
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => {
        if (startDate || endDate) {
            return { from: startDate || undefined, to: endDate || undefined };
        }
        return undefined;
    });

    // Time states for start and end
    const [startHours, setStartHours] = useState<string>(startDate ? format(startDate, "HH") : "09");
    const [startMinutes, setStartMinutes] = useState<string>(startDate ? format(startDate, "mm") : "00");
    const [endHours, setEndHours] = useState<string>(endDate ? format(endDate, "HH") : "18");
    const [endMinutes, setEndMinutes] = useState<string>(endDate ? format(endDate, "mm") : "00");

    const [hasStartTime, setHasStartTime] = useState<boolean>(() => {
        if (!startDate) return false;
        return startDate.getHours() !== 0 || startDate.getMinutes() !== 0;
    });
    const [hasEndTime, setHasEndTime] = useState<boolean>(() => {
        if (!endDate) return false;
        return endDate.getHours() !== 0 || endDate.getMinutes() !== 0;
    });

    // Sync with external values
    useEffect(() => {
        const newRange: DateRange = {
            from: startDate || undefined,
            to: endDate || undefined,
        };
        setSelectedRange(newRange.from || newRange.to ? newRange : undefined);

        if (startDate) {
            setStartHours(format(startDate, "HH"));
            setStartMinutes(format(startDate, "mm"));
            setHasStartTime(startDate.getHours() !== 0 || startDate.getMinutes() !== 0);
        } else {
            setStartHours("09");
            setStartMinutes("00");
            setHasStartTime(false);
        }

        if (endDate) {
            setEndHours(format(endDate, "HH"));
            setEndMinutes(format(endDate, "mm"));
            setHasEndTime(endDate.getHours() !== 0 || endDate.getMinutes() !== 0);
        } else {
            setEndHours("18");
            setEndMinutes("00");
            setHasEndTime(false);
        }
    }, [startDate, endDate]);

    // Handle clicking on start date part
    const handleStartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectionMode("start");
        setOpen(true);
    };

    // Handle clicking on end date part
    const handleEndClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectionMode("end");
        setOpen(true);
    };

    // Handle clicking on the button (not on start/end specifically)
    const handleButtonClick = () => {
        setOpen(true);
    };

    // Handle single date selection from calendar - we control the logic
    // Popup stays open, only closes when user clicks outside
    const handleDateSelect = (date: Date | undefined) => {
        // console.log("[DateRangePicker] handleDateSelect called:", date);
        if (!date) return;

        // Keep popup open during selection
        keepOpenRef.current = true;
        // Reset after a short delay to allow for any close events to be blocked
        setTimeout(() => {
            keepOpenRef.current = false;
        }, 100);

        const clickedDate = new Date(date);
        clickedDate.setHours(0, 0, 0, 0);

        if (selectionMode === "start") {
            // Setting start date
            if (endDate && clickedDate > endDate) {
                // Start > end: set start, clear end, switch to end mode
                onStartDateChange(clickedDate);
                onEndDateChange(null);
                setSelectedRange({ from: clickedDate, to: undefined });
            } else {
                // Normal: set start, keep end
                onStartDateChange(clickedDate);
                setSelectedRange({ from: clickedDate, to: endDate || undefined });
            }
            // Switch to end mode
            setSelectionMode("end");
        } else {
            // Setting end date
            if (startDate && clickedDate < startDate) {
                // End < start: set end, clear start, switch to start mode
                onEndDateChange(clickedDate);
                onStartDateChange(null);
                setSelectedRange({ from: undefined, to: clickedDate });
                setSelectionMode("start");
            } else {
                // Normal: set end, keep start
                onEndDateChange(clickedDate);
                setSelectedRange({ from: startDate || undefined, to: clickedDate });
            }
        }
        // Popup stays open - user must click outside to close
    };

    // Handle quick option selection
    const handleQuickDateOption = (getValue: () => Date) => {
        const date = getValue();
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);

        if (selectionMode === "start") {
            // Set start date
            if (endDate && newDate > endDate) {
                // If new start is after end, clear end
                onStartDateChange(newDate);
                onEndDateChange(null);
                setSelectedRange({ from: newDate, to: undefined });
            } else {
                onStartDateChange(newDate);
                setSelectedRange({ from: newDate, to: selectedRange?.to });
            }
            // Switch to end mode
            setSelectionMode("end");
        } else {
            // Set end date
            if (startDate && newDate < startDate) {
                // If new end is before start, clear start
                onEndDateChange(newDate);
                onStartDateChange(null);
                setSelectedRange({ from: newDate, to: undefined });
            } else {
                onEndDateChange(newDate);
                setSelectedRange({ from: selectedRange?.from, to: newDate });
            }
        }
    };

    // Handle time change for start
    const handleStartTimeChange = (type: "hours" | "minutes", val: string) => {
        const numVal = parseInt(val, 10);
        if (isNaN(numVal)) return;

        if (type === "hours") {
            const clamped = Math.max(0, Math.min(23, numVal)).toString().padStart(2, "0");
            setStartHours(clamped);
            if (selectedRange?.from) {
                const newDate = new Date(selectedRange.from);
                newDate.setHours(parseInt(clamped, 10), parseInt(startMinutes, 10), 0, 0);
                setHasStartTime(true);
                onStartDateChange(newDate);
            }
        } else {
            const clamped = Math.max(0, Math.min(59, numVal)).toString().padStart(2, "0");
            setStartMinutes(clamped);
            if (selectedRange?.from) {
                const newDate = new Date(selectedRange.from);
                newDate.setHours(parseInt(startHours, 10), parseInt(clamped, 10), 0, 0);
                setHasStartTime(true);
                onStartDateChange(newDate);
            }
        }
    };

    // Handle time change for end
    const handleEndTimeChange = (type: "hours" | "minutes", val: string) => {
        const numVal = parseInt(val, 10);
        if (isNaN(numVal)) return;

        if (type === "hours") {
            const clamped = Math.max(0, Math.min(23, numVal)).toString().padStart(2, "0");
            setEndHours(clamped);
            if (selectedRange?.to) {
                const newDate = new Date(selectedRange.to);
                newDate.setHours(parseInt(clamped, 10), parseInt(endMinutes, 10), 0, 0);
                setHasEndTime(true);
                onEndDateChange(newDate);
            }
        } else {
            const clamped = Math.max(0, Math.min(59, numVal)).toString().padStart(2, "0");
            setEndMinutes(clamped);
            if (selectedRange?.to) {
                const newDate = new Date(selectedRange.to);
                newDate.setHours(parseInt(endHours, 10), parseInt(clamped, 10), 0, 0);
                setHasEndTime(true);
                onEndDateChange(newDate);
            }
        }
    };

    // Clear all dates
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedRange(undefined);
        setHasStartTime(false);
        setHasEndTime(false);
        onStartDateChange(null);
        onEndDateChange(null);
        setOpen(false);
    };

    // Check if a date is within the allowed range
    const isDateDisabled = (date: Date): boolean => {
        const day = startOfDay(date);
        if (minDate && isBefore(day, startOfDay(minDate))) return true;
        if (maxDate && isAfter(day, startOfDay(maxDate))) return true;
        return false;
    };

    // Create disabled matcher for Calendar component
    const disabledMatcher = useMemo((): Matcher | undefined => {
        if (!minDate && !maxDate) return undefined;
        return (date: Date) => isDateDisabled(date);
    }, [minDate, maxDate]);

    // Create modifiers for today highlight and range display
    const calendarModifiers = useMemo(() => {
        const modifiers: Record<string, Matcher> = {};
        // Today modifier - always show indicator
        modifiers.todayMarker = (date: Date) => isToday(date);
        // Start date modifier
        if (startDate) {
            modifiers.rangeStart = (date: Date) => isSameDay(date, startDate);
        }
        // End date modifier
        if (endDate) {
            modifiers.rangeEnd = (date: Date) => isSameDay(date, endDate);
        }
        // Range middle modifier
        if (startDate && endDate) {
            modifiers.rangeMiddle = (date: Date) => {
                const day = startOfDay(date);
                const start = startOfDay(startDate);
                const end = startOfDay(endDate);
                return day > start && day < end;
            };
        }
        return modifiers;
    }, [startDate, endDate]);

    // Custom class names for modifiers
    const modifiersClassNames = useMemo(() => ({
        todayMarker: "today-marker",
        rangeStart: "range-start",
        rangeEnd: "range-end",
        rangeMiddle: "range-middle",
    }), []);

    // Filter quick options based on min/max dates
    const filteredQuickDateOptions = useMemo(() => {
        return QUICK_DATE_OPTIONS.filter((option) => {
            const date = option.getValue();
            return !isDateDisabled(date);
        });
    }, [minDate, maxDate]);

    // Check if picker should be fully disabled
    const isConstraintDisabled = disabled || (disabledReason !== undefined && disabledReason !== null);

    // Format strings for display
    const startDisplayStr = startDate ? formatSmartDate(startDate, showTime && hasStartTime) : null;
    const endDisplayStr = endDate ? formatSmartDate(endDate, showTime && hasEndTime) : null;

    // Check if today is selected
    const isStartToday = startDate && isToday(startDate);
    const isEndToday = endDate && isToday(endDate);

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label className="text-sm font-medium flex items-center gap-2">
                    {/* <CalendarIcon className="h-4 w-4" /> */}
                    {label}
                </Label>
            )}

            <Popover
                open={open}
                onOpenChange={(newOpen) => {
                    // console.log("[DateRangePicker] Popover onOpenChange:", newOpen, "keepOpenRef:", keepOpenRef.current);
                    if (newOpen) {
                        setOpen(true);
                    } else if (!keepOpenRef.current) {
                        // Only close if not in the middle of selecting
                        setOpen(false);
                    }
                }}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="w-full">
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={isConstraintDisabled}
                                        onClick={handleButtonClick}
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-10 px-3",
                                            !startDate && !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />

                                        {/* Date display with clickable parts */}
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                            {/* Start date part */}
                                            <span
                                                onClick={handleStartClick}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded cursor-pointer transition-colors truncate",
                                                    "hover:bg-green-500/20",
                                                    selectionMode === "start" && open && "bg-green-500/20 ring-1 ring-green-500",
                                                    isStartToday && "text-yellow-500 font-medium"
                                                )}
                                            >
                                                {startDisplayStr || "_"}
                                            </span>

                                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

                                            {/* End date part */}
                                            <span
                                                onClick={handleEndClick}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded cursor-pointer transition-colors truncate",
                                                    "hover:bg-red-500/20",
                                                    selectionMode === "end" && open && "bg-red-500/20 ring-1 ring-red-500",
                                                    isEndToday && "text-yellow-500 font-medium"
                                                )}
                                            >
                                                {endDisplayStr || "_"}
                                            </span>
                                        </div>

                                        {/* Clear button */}
                                        {(startDate || endDate) && !isConstraintDisabled && (
                                            <X
                                                className="ml-auto h-4 w-4 opacity-50 hover:opacity-100 flex-shrink-0"
                                                onClick={handleClear}
                                            />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                            </span>
                        </TooltipTrigger>
                        {disabledReason && (
                            <TooltipContent>
                                <p>{disabledReason}</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>

                <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    onCloseAutoFocus={(e) => {
                        // console.log("[DateRangePicker] onCloseAutoFocus");
                        e.preventDefault();
                    }}
                    onOpenAutoFocus={(e) => {
                        // console.log("[DateRangePicker] onOpenAutoFocus");
                        e.preventDefault();
                    }}
                    onFocusOutside={(e) => {
                        // console.log("[DateRangePicker] onFocusOutside", e);
                        e.preventDefault();
                    }}
                    onPointerDownOutside={(e) => {
                        // console.log("[DateRangePicker] onPointerDownOutside", e);
                        setOpen(false);
                    }}
                    onInteractOutside={(e) => {
                        // console.log("[DateRangePicker] onInteractOutside", e);
                        e.preventDefault();
                    }}
                    onEscapeKeyDown={() => {
                        // console.log("[DateRangePicker] onEscapeKeyDown");
                        setOpen(false);
                    }}
                >
                    <div
                        className="flex"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Quick options sidebar */}
                        <div className="border-r p-2 space-y-1 min-w-[100px]">
                            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                                Quick select
                            </p>
                            {filteredQuickDateOptions.map((option) => (
                                <Button
                                    key={option.label}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7"
                                    onClick={() => handleQuickDateOption(option.getValue)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                            {filteredQuickDateOptions.length === 0 && (
                                <p className="text-xs text-muted-foreground px-2 py-1 italic">
                                    No options
                                </p>
                            )}
                        </div>

                        {/* Calendar */}
                        <div className="calendar-green-red-range">
                            <style>{`
                                /* Reset any default selected styles that might override our colors */
                                .calendar-green-red-range [aria-selected="true"] {
                                    background-color: transparent;
                                }

                                /* Start date = green - ALWAYS green, highest priority */
                                .calendar-green-red-range .range-start,
                                .calendar-green-red-range .range-start[aria-selected="true"],
                                .calendar-green-red-range .range-start[data-selected="true"],
                                .calendar-green-red-range button.range-start {
                                    background-color: #22c55e !important;
                                    color: white !important;
                                    border-radius: 6px !important;
                                }
                                .calendar-green-red-range .range-start:hover {
                                    background-color: #16a34a !important;
                                }

                                /* End date = red - ALWAYS red, highest priority */
                                .calendar-green-red-range .range-end,
                                .calendar-green-red-range .range-end[aria-selected="true"],
                                .calendar-green-red-range .range-end[data-selected="true"],
                                .calendar-green-red-range button.range-end {
                                    background-color: #ef4444 !important;
                                    color: white !important;
                                    border-radius: 6px !important;
                                }
                                .calendar-green-red-range .range-end:hover {
                                    background-color: #dc2626 !important;
                                }

                                /* When start and end are same date - show gradient */
                                .calendar-green-red-range .range-start.range-end,
                                .calendar-green-red-range .range-start.range-end[aria-selected="true"],
                                .calendar-green-red-range button.range-start.range-end {
                                    background: linear-gradient(135deg, #22c55e 50%, #ef4444 50%) !important;
                                    color: white !important;
                                }

                                /* Range middle = accent color */
                                .calendar-green-red-range .range-middle {
                                    background-color: hsl(var(--accent)) !important;
                                    color: hsl(var(--accent-foreground)) !important;
                                    border-radius: 0 !important;
                                }

                                /* Today marker - yellow dot at bottom, always visible */
                                .calendar-green-red-range .today-marker {
                                    position: relative;
                                }
                                .calendar-green-red-range .today-marker::after {
                                    content: '';
                                    position: absolute;
                                    bottom: 2px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    width: 5px;
                                    height: 5px;
                                    border-radius: 50%;
                                    background-color: #eab308;
                                    z-index: 10;
                                }
                            `}</style>

                            <div
                                onMouseDown=
                                {
                                    (e) => 
                                        e.stopPropagation()

                                }
                                onClick={
                                    (e) => 
                                        e.stopPropagation()
                                }
                                onPointerDown={(e) => 
                                    e.stopPropagation()
                                }
                            >
                                <Calendar
                                    mode="single"
                                    selected={undefined}
                                    onSelect={handleDateSelect}
                                    disabled={disabledMatcher}
                                    modifiers={calendarModifiers}
                                    modifiersClassNames={modifiersClassNames}
                                    numberOfMonths={2}
                                    defaultMonth={startDate || endDate || undefined}
                                    autoFocus={false}
                                />
                            </div>

                            {/* Time pickers for start and end */}
                            {showTime && (
                                <div className="border-t p-3 space-y-3">
                                    {/* Start time */}
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-muted-foreground w-12">Start:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={startHours}
                                                onChange={(e) => handleStartTimeChange("hours", e.target.value)}
                                                disabled={!selectedRange?.from}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-background disabled:opacity-50"
                                            />
                                            <span className="text-muted-foreground">:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={startMinutes}
                                                onChange={(e) => handleStartTimeChange("minutes", e.target.value)}
                                                disabled={!selectedRange?.from}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-background disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    {/* End time */}
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-red-500" />
                                        <span className="text-sm text-muted-foreground w-12">End:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={endHours}
                                                onChange={(e) => handleEndTimeChange("hours", e.target.value)}
                                                disabled={!selectedRange?.to}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-background disabled:opacity-50"
                                            />
                                            <span className="text-muted-foreground">:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={endMinutes}
                                                onChange={(e) => handleEndTimeChange("minutes", e.target.value)}
                                                disabled={!selectedRange?.to}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-background disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
