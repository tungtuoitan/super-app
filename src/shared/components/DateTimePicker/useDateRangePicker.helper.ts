/**
 * DateRangePicker state + handlers (moved out of DateRangePicker.tsx, unchanged)
 */

import React, { useState } from "react";
import { format, isBefore, isAfter, startOfDay, startOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SelectionMode, UseDateRangePickerParams } from "./dateRangePicker.type";
import { QUICK_DATE_OPTIONS } from "./dateRangePicker.constants";

export function useDateRangePickerHelper({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    minDate,
    maxDate,
}: UseDateRangePickerParams) {
    const [open, setOpenState] = useState(false);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("start");
    // First month shown by the calendar; undefined = start at the From (or To) date. Follows the From / To switch.
    const [visibleMonth, setVisibleMonth] = useState<Date | undefined>(undefined);

    // Use ref to track if we should keep open (to handle race conditions)
    const keepOpenRef = React.useRef(false);

    // Debug wrapper for setOpen
    const setOpen = (value: boolean) => {
        if (!value && keepOpenRef.current) {
            return; // Block close if we're in the middle of selecting
        }
        if (value) setVisibleMonth(undefined);
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

    // From / To switch in the popup: pick which date the next click sets and bring that date into view
    const focusEdge = (mode: SelectionMode) => {
        setSelectionMode(mode);
        const edge = mode === "start" ? startDate : endDate;
        if (edge) setVisibleMonth(startOfMonth(edge));
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
            // Move on to "To" only when there is no end yet (or it was just cleared); otherwise stay on "From"
            if (!endDate || clickedDate > endDate) setSelectionMode("end");
        } else {
            // Setting end date (days before the start are disabled, so it is always >= start); stay on "To"
            onEndDateChange(clickedDate);
            setSelectedRange({ from: startDate || undefined, to: clickedDate });
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
            // Move on to "To" only when there is no end yet (or it was just cleared)
            if (!endDate || newDate > endDate) setSelectionMode("end");
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

    // Empty both dates (shared by the trigger's X and the popup's Reset)
    const clearDates = () => {
        setSelectedRange(undefined);
        setHasStartTime(false);
        setHasEndTime(false);
        onStartDateChange(null);
        onEndDateChange(null);
    };

    // The trigger's X: clear and close
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        clearDates();
        setOpen(false);
    };

    // The popup's Reset: clear but keep the popup open, ready to pick a new From
    const handleReset = () => {
        clearDates();
        setSelectionMode("start");
    };

    // Check if a date is within the allowed range
    const isDateDisabled = (date: Date): boolean => {
        const day = startOfDay(date);
        if (minDate && isBefore(day, startOfDay(minDate))) return true;
        if (maxDate && isAfter(day, startOfDay(maxDate))) return true;
        // Picking "To": an end before the start is not allowed, so it never wipes the start by accident
        if (selectionMode === "end" && startDate && isBefore(day, startOfDay(startDate))) return true;
        return false;
    };

    // Create disabled matcher for Calendar component
    const disabledMatcher = (() => {
        if (!minDate && !maxDate && !(selectionMode === "end" && startDate)) return undefined;
        return (date: Date) => isDateDisabled(date);
    })();

    // Filter quick options based on min/max dates
    const filteredQuickDateOptions = QUICK_DATE_OPTIONS.filter((option) => {
            const date = option.getValue();
            return !isDateDisabled(date);
        });
    

    return {
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
    };
}
