/**
 * DateRangePicker Component
 * A date range picker combining start and end date into a single field
 * Click on Start/End in the field to toggle selection mode
 * Calendar always shows range with good/green (start) and danger/red (end) tokens
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/shared";
import { Popover, PopoverContent } from "@/shared";
import { Label } from "@/shared";
import "./dateTimePicker.css";
import { buildCalendarModifiers, formatSmartDate } from "./dateRangePicker.utils";
import { MODIFIERS_CLASS_NAMES } from "./dateRangePicker.constants";
import type { DateRangePickerProps } from "./dateRangePicker.type";
import { useDateRangePickerHelper } from "./useDateRangePicker.helper";
import { useDateRangePickerHeadless } from "./useDateRangePicker.headless";
import { DateRangeTrigger } from "./small/DateRangeTrigger";
import { DateRangeQuickOptions } from "./small/DateRangeQuickOptions";
import { DateRangeEdgeSwitch } from "./small/DateRangeEdgeSwitch";
import { DateRangeTimeInputs } from "./small/DateRangeTimeInputs";

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
    const {
        open,
        setOpen,
        keepOpenRef,
        selectionMode,
        visibleMonth,
        setVisibleMonth,
        selectedRange,
        setSelectedRange,
        startHours,
        setStartHours,
        startMinutes,
        setStartMinutes,
        endHours,
        setEndHours,
        endMinutes,
        setEndMinutes,
        hasStartTime,
        setHasStartTime,
        hasEndTime,
        setHasEndTime,
        handleStartClick,
        handleEndClick,
        focusEdge,
        handleButtonClick,
        handleDateSelect,
        handleQuickDateOption,
        handleStartTimeChange,
        handleEndTimeChange,
        handleClear,
        handleReset,
        disabledMatcher,
        filteredQuickDateOptions,
    } = useDateRangePickerHelper({ startDate, endDate, onStartDateChange, onEndDateChange, minDate, maxDate });

    // Sync with external values
    useDateRangePickerHeadless({
        startDate,
        endDate,
        setSelectedRange,
        setStartHours,
        setStartMinutes,
        setEndHours,
        setEndMinutes,
        setHasStartTime,
        setHasEndTime,
    });

    // Create modifiers for today highlight and range display
    const calendarModifiers = buildCalendarModifiers(startDate, endDate, selectionMode, limitStartDate, limitEndDate);

    // Check if picker should be fully disabled
    const isConstraintDisabled = disabled || (disabledReason !== undefined && disabledReason !== null);

    // Format strings for display
    const startDisplayStr = startDate ? formatSmartDate(startDate, showTime && hasStartTime) : null;
    const endDisplayStr = endDate ? formatSmartDate(endDate, showTime && hasEndTime) : null;

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
                <DateRangeTrigger
                    startDate={startDate}
                    endDate={endDate}
                    limitStartDate={limitStartDate}
                    limitEndDate={limitEndDate}
                    placeholder={placeholder}
                    compact={compact}
                    compactTone={compactTone}
                    isConstraintDisabled={isConstraintDisabled}
                    disabledReason={disabledReason}
                    selectionMode={selectionMode}
                    open={open}
                    startDisplayStr={startDisplayStr}
                    endDisplayStr={endDisplayStr}
                    handleButtonClick={handleButtonClick}
                    handleClear={handleClear}
                    handleStartClick={handleStartClick}
                    handleEndClick={handleEndClick}
                />

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
                        <DateRangeQuickOptions
                            startDate={startDate}
                            endDate={endDate}
                            isConstraintDisabled={isConstraintDisabled}
                            filteredQuickDateOptions={filteredQuickDateOptions}
                            handleQuickDateOption={handleQuickDateOption}
                            handleReset={handleReset}
                        />

                        {/* Calendar */}
                        <div className="calendar-green-red-range">

                            {/* From / To switch — the user decides which date the next click sets */}
                            <DateRangeEdgeSwitch
                                selectionMode={selectionMode}
                                startDisplayStr={startDisplayStr}
                                endDisplayStr={endDisplayStr}
                                focusEdge={focusEdge}
                            />

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
                                    modifiersClassNames={MODIFIERS_CLASS_NAMES}
                                    numberOfMonths={2}
                                    month={visibleMonth}
                                    onMonthChange={setVisibleMonth}
                                    defaultMonth={startDate || endDate || undefined}
                                    autoFocus={false}
                                />
                            </div>

                            {/* Time pickers for start and end */}
                            {showTime && (
                                <DateRangeTimeInputs
                                    selectedRange={selectedRange}
                                    startHours={startHours}
                                    startMinutes={startMinutes}
                                    endHours={endHours}
                                    endMinutes={endMinutes}
                                    handleStartTimeChange={handleStartTimeChange}
                                    handleEndTimeChange={handleEndTimeChange}
                                />
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
