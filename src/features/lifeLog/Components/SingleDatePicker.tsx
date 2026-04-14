/**
 * SingleDatePicker - Pick a single date with optional hour (stepper buttons)
 * - Calendar with today dot marker (same style as DateRangePicker)
 * - Hour stepper: ▲/▼ buttons, range 0–23, optional
 * - Clear button
 */

import { useState, useEffect } from "react";
import { format, isToday, isSameYear } from "date-fns";
import { CalendarIcon, X, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Calendar } from "@/Components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { cn } from "@/lib/utils";

interface SingleDatePickerProps {
    value: Date | null | undefined;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    className?: string;
    maxDate?: Date;
}

function formatDisplay(date: Date): string {
    const now = new Date();
    const hasTime = date.getHours() !== 0;
    let dateStr: string;
    if (isToday(date)) {
        dateStr = "Today";
    } else if (isSameYear(date, now)) {
        dateStr = format(date, "d/M");
    } else {
        dateStr = format(date, "d/M/yyyy");
    }
    return hasTime ? `${dateStr}, ${format(date, "H:mm")}` : dateStr;
}

// null means "no hour set" (midnight / unspecified)
function getHour(date: Date | null | undefined): number | null {
    if (!date) return null;
    return date.getHours() !== 0 ? date.getHours() : null;
}

export function SingleDatePicker({ value, onChange, placeholder = "Pick date", className, maxDate }: SingleDatePickerProps) {
    const [open, setOpen] = useState(false);
    // null = no hour chosen, 0–23 = chosen
    const [hour, setHour] = useState<number | null>(() => getHour(value));

    // Sync when value changes externally
    useEffect(() => {
        setHour(getHour(value));
    }, [value]);

    const applyHour = (date: Date, h: number | null) => {
        const d = new Date(date);
        d.setHours(h ?? 0, 0, 0, 0);
        return d;
    };

    const handleDaySelect = (day: Date | undefined) => {
        if (!day) return;
        onChange(applyHour(day, hour));
    };

    const stepHour = (delta: number) => {
        if (!value) return;
        const current = hour ?? 0;
        const next = Math.max(0, Math.min(23, current + delta));
        setHour(next);
        onChange(applyHour(value, next));
    };

    const toggleHour = () => {
        if (!value) return;
        if (hour !== null) {
            // Clear hour
            setHour(null);
            const d = new Date(value);
            d.setHours(0, 0, 0, 0);
            onChange(d);
        } else {
            // Enable hour at current time
            const h = new Date().getHours();
            setHour(h);
            onChange(applyHour(value, h));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setHour(null);
        onChange(null);
    };

    const hourEnabled = hour !== null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-muted/30 transition-colors text-left",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className={cn("flex-1", value && isToday(value) ? "text-yellow-500 font-medium" : "")}>
                        {value ? formatDisplay(value) : placeholder}
                    </span>
                    {value && (
                        <X
                            className="w-3 h-3 text-muted-foreground hover:text-foreground flex-shrink-0"
                            onClick={handleClear}
                        />
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                {/* Calendar with today dot */}
                <div className="single-date-picker-calendar">
                    <style>{`
                        /* Selected date = green — target Radix data-selected-single attribute */
                        .single-date-picker-calendar [data-selected-single="true"],
                        .single-date-picker-calendar [aria-selected="true"] {
                            background-color: #22c55e !important;
                            color: white !important;
                            border-radius: 6px !important;
                        }
                        .single-date-picker-calendar [data-selected-single="true"]:hover,
                        .single-date-picker-calendar [aria-selected="true"]:hover {
                            background-color: #16a34a !important;
                        }

                        /* Today dot — always visible, even on selected */
                        .single-date-picker-calendar .today-dot {
                            position: relative;
                        }
                        .single-date-picker-calendar .today-dot::after {
                            content: '';
                            position: absolute;
                            bottom: 2px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 4px;
                            height: 4px;
                            border-radius: 50%;
                            background-color: #eab308;
                            z-index: 10;
                        }
                        /* Keep dot visible when today is selected (green bg) */
                        .single-date-picker-calendar [data-selected-single="true"].today-dot::after,
                        .single-date-picker-calendar [aria-selected="true"].today-dot::after {
                            background-color: #fef08a;
                        }
                    `}</style>
                    <Calendar
                        mode="single"
                        selected={value ?? undefined}
                        onSelect={handleDaySelect}
                        disabled={maxDate ? (d) => d > maxDate : undefined}
                        defaultMonth={value ?? undefined}
                        autoFocus={false}
                        modifiers={{ todayDot: (d) => isToday(d) }}
                        modifiersClassNames={{ todayDot: "today-dot" }}
                    />
                </div>

                {/* Hour stepper */}
                <div className="border-t px-3 py-2.5 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleHour}
                        disabled={!value}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Hour</span>
                    </button>

                    {hourEnabled ? (
                        <div className="flex items-center gap-1 ml-auto">
                            <button
                                type="button"
                                onClick={() => stepHour(-1)}
                                disabled={hour <= 0}
                                className="w-6 h-6 flex items-center justify-center rounded border border-input hover:bg-muted/50 disabled:opacity-30 transition-colors"
                            >
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-mono tabular-nums">
                                {String(hour).padStart(2, "0")}:00
                            </span>
                            <button
                                type="button"
                                onClick={() => stepHour(1)}
                                disabled={hour >= 23}
                                className="w-6 h-6 flex items-center justify-center rounded border border-input hover:bg-muted/50 disabled:opacity-30 transition-colors"
                            >
                                <ChevronUp className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <span className="ml-auto text-xs text-muted-foreground italic">not set — click to add</span>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
