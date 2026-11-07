/**
 * DateRangePicker headless effects (moved out of DateRangePicker.tsx, unchanged)
 */

import { useEffect } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { UseDateRangePickerHeadlessParams } from "./dateRangePicker.type";

export function useDateRangePickerHeadless({
    startDate,
    endDate,
    setSelectedRange,
    setStartHours,
    setStartMinutes,
    setEndHours,
    setEndMinutes,
    setHasStartTime,
    setHasEndTime,
}: UseDateRangePickerHeadlessParams) {
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
}
