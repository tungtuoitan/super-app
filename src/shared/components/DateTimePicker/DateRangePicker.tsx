/**
 * DateRangePicker Component
 * A date range picker combining start and end date into a single field
 * Click on Start/End in the field to toggle selection mode
 * Calendar always shows range with good/green (start) and danger/red (end) tokens
 */

import React, { useState, useEffect, useMemo } from "react";
import { format, isToday, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared";
import { Calendar } from "@/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared";
import { Label } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { formatCompactDateRange } from "@/shared";
import type { DateTone } from "@/shared";
import "./dateTimePicker.css";
import type { Matcher, DateRange } from "react-day-picker";
import type { SelectionMode } from "./dateRangePicker.type";
import { checkDateWarning, formatTaskDuration, formatSmartDate } from "./dateRangePicker.utils";
import { QUICK_DATE_OPTIONS } from "./dateRangePicker.constants";

export interface DateRangePickerProps {
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
    /** Limit start date to highlight as visual reference (project/parent start) */
    limitStartDate?: Date | null;
    /** Limit end date to highlight as visual reference (project/parent end) */
    limitEndDate?: Date | null;
    /** Compact trigger for dense lists: "07–08 Oct" text, no icon/arrows (#1514) */
    compact?: boolean;
    /** Tone of the compact label (overdue → red, today → amber dot) */
    compactTone?: DateTone;
}


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
    limitStartDate,
    limitEndDate,
    compact = false,
    compactTone = "normal",
}: DateRangePickerProps) {
    const [open, setOpenState] = useState(false);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("start");

    // Use ref to track if we should keep open (to handle race conditions)
    const keepOpenRef = React.useRef(false);

    // Debug wrapper for setOpen
    const setOpen = (value: boolean) => {
        if (!value && keepOpenRef.current) {
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
    const disabledMatcher = (() => {
        if (!minDate && !maxDate) return undefined;
        return (date: Date) => isDateDisabled(date);
    })();

    // Create modifiers for today highlight and range display
    const calendarModifiers = (() => {
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
        // Limit start date modifier (project/parent start)
        if (limitStartDate) {
            modifiers.limitStart = (date: Date) => isSameDay(date, limitStartDate);
        }
        // Limit end date modifier (project/parent end)
        if (limitEndDate) {
            modifiers.limitEnd = (date: Date) => isSameDay(date, limitEndDate);
        }
        return modifiers;
    })()

    // Custom class names for modifiers
    const modifiersClassNames = {
        todayMarker: "today-marker",
        rangeStart: "range-start",
        rangeEnd: "range-end",
        rangeMiddle: "range-middle",
        limitStart: "limit-start",
        limitEnd: "limit-end",
    }

    // Filter quick options based on min/max dates
    const filteredQuickDateOptions = QUICK_DATE_OPTIONS.filter((option) => {
            const date = option.getValue();
            return !isDateDisabled(date);
        });
    

    // Check if picker should be fully disabled
    const isConstraintDisabled = disabled || (disabledReason !== undefined && disabledReason !== null);

    // Format strings for display
    const startDisplayStr = startDate ? formatSmartDate(startDate, showTime && hasStartTime) : null;
    const endDisplayStr = endDate ? formatSmartDate(endDate, showTime && hasEndTime) : null;

    // Check if today is selected
    const isStartToday = startDate && isToday(startDate);
    const isEndToday = endDate && isToday(endDate);

    // Calculate date warning
    const dateWarning = checkDateWarning(startDate, endDate, limitStartDate, limitEndDate)

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label className="text-[13px] font-medium flex items-center gap-2">
                    {/* <CalendarIcon className="h-4 w-4" /> */}
                    {label}
                </Label>
            )}

            <Popover
                open={open}
                onOpenChange={(newOpen) => {
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
                                    {compact ? (
                                    <Button
                                        variant="ghost"
                                        disabled={isConstraintDisabled}
                                        onClick={handleButtonClick}
                                        className={cn("group/date w-full justify-end gap-1.5 h-7 px-1.5 text-[13px] font-normal tabular-nums", compactTone === "overdue" ? "text-sa-danger" : "text-muted-foreground")}
                                    >
                                        {compactTone === "today" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sa-amber" />}
                                        <span className="truncate">{formatCompactDateRange(startDate, endDate) || placeholder}</span>
                                        {(startDate || endDate) && !isConstraintDisabled && (
                                            <X className="h-3 w-3 shrink-0 opacity-0 group-hover/date:opacity-60 hover:!opacity-100" onClick={handleClear} />
                                        )}
                                    </Button>
                                    ) : (
                                    <Button
                                        variant="outline"
                                        disabled={isConstraintDisabled}
                                        onClick={handleButtonClick}
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-8 px-2.5",
                                            !startDate && !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        {/* Calendar icon with warning tooltip */}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="mr-2 flex-shrink-0 cursor-help" onClick={(e) => e.stopPropagation()}>
                                                        <CalendarIcon className={cn(
                                                            "h-4 w-4",
                                                            dateWarning.hasWarning ? "text-sa-amber-ink" : "text-muted-foreground"
                                                        )} />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {dateWarning.hasWarning ? (
                                                        <div className="space-y-1">
                                                            <p className="text-sa-amber-ink font-medium">{dateWarning.warningMessage}</p>
                                                            <p className="text-xs text-muted-foreground">{formatTaskDuration(dateWarning.taskDurationDays)}</p>
                                                        </div>
                                                    ) : (
                                                        <p>{formatTaskDuration(dateWarning.taskDurationDays)}</p>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {/* Date display with clickable parts */}
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                            {/* Start date part */}
                                            <span
                                                onClick={handleStartClick}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded-md cursor-pointer transition-colors duration-100 truncate tabular-nums",
                                                    "hover:bg-sa-good/15",
                                                    selectionMode === "start" && open && "bg-sa-good/15 ring-1 ring-sa-good/70",
                                                    isStartToday && "text-sa-amber-ink font-medium"
                                                )}
                                            >
                                                {startDisplayStr || "_"}
                                            </span>

                                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

                                            {/* End date part */}
                                            <span
                                                onClick={handleEndClick}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded-md cursor-pointer transition-colors duration-100 truncate tabular-nums",
                                                    "hover:bg-sa-danger/15",
                                                    selectionMode === "end" && open && "bg-sa-danger/15 ring-1 ring-sa-danger/70",
                                                    isEndToday && "text-sa-amber-ink font-medium"
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
                                    )}
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
                        e.preventDefault();
                    }}
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                    }}
                    onFocusOutside={(e) => {
                        e.preventDefault();
                    }}
                    onPointerDownOutside={(e) => {
                        setOpen(false);
                    }}
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                    onEscapeKeyDown={() => {
                        setOpen(false);
                    }}
                >
                    <div
                        className="flex"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Quick options sidebar */}
                        <div className="border-r border-sa-border p-1.5 space-y-0.5 min-w-[104px]">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-2 py-1">
                                Quick select
                            </p>
                            {filteredQuickDateOptions.map((option) => (
                                <Button
                                    key={option.label}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs font-normal h-7"
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
                                <div className="border-t border-sa-border p-3 space-y-2.5">
                                    {/* Start time */}
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-sa-good" />
                                        <span className="text-[13px] text-muted-foreground w-12">Start:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={startHours}
                                                onChange={(e) => handleStartTimeChange("hours", e.target.value)}
                                                disabled={!selectedRange?.from}
                                                className="w-12 h-7 text-center text-[13px] font-mono border border-input rounded-md bg-transparent focus:outline-none focus:border-ring disabled:opacity-50"
                                            />
                                            <span className="text-muted-foreground">:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={startMinutes}
                                                onChange={(e) => handleStartTimeChange("minutes", e.target.value)}
                                                disabled={!selectedRange?.from}
                                                className="w-12 h-7 text-center text-[13px] font-mono border border-input rounded-md bg-transparent focus:outline-none focus:border-ring disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    {/* End time */}
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-sa-danger" />
                                        <span className="text-[13px] text-muted-foreground w-12">End:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={endHours}
                                                onChange={(e) => handleEndTimeChange("hours", e.target.value)}
                                                disabled={!selectedRange?.to}
                                                className="w-12 h-7 text-center text-[13px] font-mono border border-input rounded-md bg-transparent focus:outline-none focus:border-ring disabled:opacity-50"
                                            />
                                            <span className="text-muted-foreground">:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={endMinutes}
                                                onChange={(e) => handleEndTimeChange("minutes", e.target.value)}
                                                disabled={!selectedRange?.to}
                                                className="w-12 h-7 text-center text-[13px] font-mono border border-input rounded-md bg-transparent focus:outline-none focus:border-ring disabled:opacity-50"
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
