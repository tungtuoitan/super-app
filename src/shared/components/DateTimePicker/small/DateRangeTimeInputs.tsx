/**
 * DateRangePicker time inputs (moved out of DateRangePicker.tsx, unchanged)
 */

import React from "react";
import { Clock } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface DateRangeTimeInputsProps {
    selectedRange: DateRange | undefined;
    startHours: string;
    startMinutes: string;
    endHours: string;
    endMinutes: string;
    handleStartTimeChange: (type: "hours" | "minutes", val: string) => void;
    handleEndTimeChange: (type: "hours" | "minutes", val: string) => void;
}

export function DateRangeTimeInputs({
    selectedRange,
    startHours,
    startMinutes,
    endHours,
    endMinutes,
    handleStartTimeChange,
    handleEndTimeChange,
}: DateRangeTimeInputsProps) {
    return (
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
    );
}
