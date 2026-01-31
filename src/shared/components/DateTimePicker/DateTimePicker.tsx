/**
 * DateTimePicker Component
 * A date and time picker with quick options (Today, Tomorrow, etc.)
 * Smart relative date display: today, tomorrow, Mon, Next Mon, 21/3
 */

import React, { useState, useEffect } from "react";
import { format, isToday, isTomorrow, isSameWeek, addWeeks, isSameYear, startOfWeek, endOfWeek } from "date-fns";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { Calendar } from "@/Components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Label } from "@/Components/ui/label";

interface DateTimePickerProps {
    value: Date | null | undefined;
    onChange: (date: Date | null) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    showTime?: boolean;
}

/**
 * Format date to smart relative display
 * - today: "today"
 * - tomorrow: "tomorrow"
 * - this week: "Mon", "Tue", etc.
 * - next week: "Next Mon", "Next Tue", etc.
 * - same year: "21/3"
 * - different year: "21/3/2025"
 * - with time: append ", 9:30"
 */
interface SmartDateResult {
    text: string;
    isToday: boolean;
}

function formatSmartDate(date: Date, hasTime: boolean): SmartDateResult {
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let dateStr = "";
    let isTodayDate = false;

    if (isToday(date)) {
        dateStr = "Today";
        isTodayDate = true;
    } else if (isTomorrow(date)) {
        dateStr = "Tomorrow";
    } else if (isSameWeek(date, now, { weekStartsOn: 1 })) {
        // This week (Monday as start)
        dateStr = dayNames[date.getDay()];
    } else {
        // Check if next week
        const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

        if (date >= nextWeekStart && date <= nextWeekEnd) {
            dateStr = `Next ${dayNames[date.getDay()]}`;
        } else if (isSameYear(date, now)) {
            // Same year: "21/3"
            dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
        } else {
            // Different year: "21/3/2025"
            dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }
    }

    // Add time if user has selected time
    if (hasTime) {
        const timeStr = format(date, "H:mm");
        dateStr = `${dateStr}, ${timeStr}`;
    }

    return { text: dateStr, isToday: isTodayDate };
}

// Quick date options
const QUICK_OPTIONS = [
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

export function DateTimePicker({
    value,
    onChange,
    label,
    placeholder = "Pick a date",
    disabled = false,
    className,
    showTime = true,
}: DateTimePickerProps) {
    const [open, setOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(value || undefined);
    const [hours, setHours] = useState<string>(value ? format(value, "HH") : "09");
    const [minutes, setMinutes] = useState<string>(value ? format(value, "mm") : "00");
    // Track if user has explicitly set time (not default 00:00)
    const [hasTimeSelected, setHasTimeSelected] = useState<boolean>(() => {
        if (!value) return false;
        // If time is not midnight (00:00), consider it as having time selected
        return value.getHours() !== 0 || value.getMinutes() !== 0;
    });

    // Sync with external value
    useEffect(() => {
        if (value) {
            setSelectedDate(value);
            setHours(format(value, "HH"));
            setMinutes(format(value, "mm"));
            // Update hasTimeSelected based on value
            setHasTimeSelected(value.getHours() !== 0 || value.getMinutes() !== 0);
        } else {
            setSelectedDate(undefined);
            setHours("09");
            setMinutes("00");
            setHasTimeSelected(false);
        }
    }, [value]);

    // Handle date selection from calendar (no time by default)
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
            // When selecting date from calendar, don't apply time unless already selected
            if (hasTimeSelected) {
                applyDateTime(date, hours, minutes, true);
            } else {
                applyDateTime(date, "00", "00", false);
            }
        }
    };

    // Handle quick option selection (no time by default)
    const handleQuickOption = (getValue: () => Date) => {
        const date = getValue();
        setSelectedDate(date);
        // Quick options don't have time by default
        if (hasTimeSelected) {
            applyDateTime(date, hours, minutes, true);
        } else {
            applyDateTime(date, "00", "00", false);
        }
    };

    // Apply date and time
    const applyDateTime = (date: Date, h: string, m: string, withTime: boolean) => {
        const newDate = new Date(date);
        newDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        setHasTimeSelected(withTime);
        onChange(newDate);
    };

    // Handle time change - marks time as explicitly selected
    const handleTimeChange = (type: "hours" | "minutes", val: string) => {
        const numVal = parseInt(val, 10);
        if (isNaN(numVal)) return;

        if (type === "hours") {
            const clamped = Math.max(0, Math.min(23, numVal)).toString().padStart(2, "0");
            setHours(clamped);
            if (selectedDate) {
                applyDateTime(selectedDate, clamped, minutes, true);
            }
        } else {
            const clamped = Math.max(0, Math.min(59, numVal)).toString().padStart(2, "0");
            setMinutes(clamped);
            if (selectedDate) {
                applyDateTime(selectedDate, hours, clamped, true);
            }
        }
    };

    // Clear date
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(undefined);
        setHasTimeSelected(false);
        onChange(null);
    };

    // Format display value using smart relative date format
    const smartDate = value
        ? formatSmartDate(value, showTime && hasTimeSelected)
        : null;

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {label}
                </Label>
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className={cn(smartDate?.isToday && "text-yellow-500 font-medium")}>
                            {smartDate?.text || placeholder}
                        </span>
                        {value && !disabled && (
                            <X
                                className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                                onClick={handleClear}
                            />
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        {/* Quick options sidebar */}
                        <div className="border-r p-2 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                                Quick select
                            </p>
                            {QUICK_OPTIONS.map((option) => (
                                <Button
                                    key={option.label}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7"
                                    onClick={() => handleQuickOption(option.getValue)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>

                        {/* Calendar */}
                        <div>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                initialFocus
                            />

                            {/* Time picker */}
                            {showTime && (
                                <div className="border-t p-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Time:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={hours}
                                                onChange={(e) => handleTimeChange("hours", e.target.value)}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-background"
                                            />
                                            <span className="text-muted-foreground">:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={minutes}
                                                onChange={(e) => handleTimeChange("minutes", e.target.value)}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-background"
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
