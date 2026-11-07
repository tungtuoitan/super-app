/**
 * DateRangePicker trigger button with warning tooltip (moved out of DateRangePicker.tsx, unchanged)
 */

import React from "react";
import { isToday } from "date-fns";
import { Calendar as CalendarIcon, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared";
import { PopoverTrigger } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { formatCompactDateRange } from "@/shared";
import type { DateTone } from "@/shared";
import type { SelectionMode } from "../dateRangePicker.type";
import { checkDateWarning, formatTaskDuration } from "../dateRangePicker.utils";

interface DateRangeTriggerProps {
    startDate: Date | null | undefined;
    endDate: Date | null | undefined;
    limitStartDate?: Date | null;
    limitEndDate?: Date | null;
    placeholder: string;
    compact: boolean;
    compactTone: DateTone;
    isConstraintDisabled: boolean;
    disabledReason?: string;
    selectionMode: SelectionMode;
    open: boolean;
    startDisplayStr: string | null;
    endDisplayStr: string | null;
    handleButtonClick: () => void;
    handleClear: (e: React.MouseEvent) => void;
    handleStartClick: (e: React.MouseEvent) => void;
    handleEndClick: (e: React.MouseEvent) => void;
}

export function DateRangeTrigger({
    startDate,
    endDate,
    limitStartDate,
    limitEndDate,
    placeholder,
    compact,
    compactTone,
    isConstraintDisabled,
    disabledReason,
    selectionMode,
    open,
    startDisplayStr,
    endDisplayStr,
    handleButtonClick,
    handleClear,
    handleStartClick,
    handleEndClick,
}: DateRangeTriggerProps) {
    // Check if today is selected
    const isStartToday = startDate && isToday(startDate);
    const isEndToday = endDate && isToday(endDate);

    // Calculate date warning
    const dateWarning = checkDateWarning(startDate, endDate, limitStartDate, limitEndDate)

    return (
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
    );
}
