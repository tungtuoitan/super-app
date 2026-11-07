/**
 * DateRangePicker types (#1514 — moved out of DateRangePicker.tsx, unchanged)
 */

import type { DateRange } from "react-day-picker";
import type { DateTone } from "@/shared";

/**
 * Date warning result for limit checking
 */
export interface DateWarningResult {
    hasWarning: boolean;
    warningMessage: string | null;
    taskDurationDays: number | null;
}

export type SelectionMode = "start" | "end";


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

export interface UseDateRangePickerParams {
    startDate: Date | null | undefined;
    endDate: Date | null | undefined;
    onStartDateChange: (date: Date | null) => void;
    onEndDateChange: (date: Date | null) => void;
    minDate?: Date | null;
    maxDate?: Date | null;
}

export interface UseDateRangePickerHeadlessParams {
    startDate: Date | null | undefined;
    endDate: Date | null | undefined;
    setSelectedRange: (range: DateRange | undefined) => void;
    setStartHours: (value: string) => void;
    setStartMinutes: (value: string) => void;
    setEndHours: (value: string) => void;
    setEndMinutes: (value: string) => void;
    setHasStartTime: (value: boolean) => void;
    setHasEndTime: (value: boolean) => void;
}
