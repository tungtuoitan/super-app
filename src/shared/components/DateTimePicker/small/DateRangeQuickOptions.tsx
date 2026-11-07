/**
 * DateRangePicker quick options sidebar (moved out of DateRangePicker.tsx, unchanged)
 */

import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/shared";

interface DateRangeQuickOptionsProps {
    startDate: Date | null | undefined;
    endDate: Date | null | undefined;
    isConstraintDisabled: boolean;
    filteredQuickDateOptions: { label: string; getValue: () => Date }[];
    handleQuickDateOption: (getValue: () => Date) => void;
    handleReset: () => void;
}

export function DateRangeQuickOptions({
    startDate,
    endDate,
    isConstraintDisabled,
    filteredQuickDateOptions,
    handleQuickDateOption,
    handleReset,
}: DateRangeQuickOptionsProps) {
    return (
                        <div className="flex flex-col gap-0.5 border-r border-sa-border p-1.5 min-w-[104px]">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-2 py-1">
                                Quick select
                            </p>
                            {filteredQuickDateOptions.map((option) => (
                                <Button
                                    key={option.label}
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start text-xs font-normal h-7"
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
                            {(startDate || endDate) && !isConstraintDisabled && (
                                <div className="mt-1 flex flex-col border-t border-sa-border pt-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start gap-1.5 text-xs font-normal h-7 text-muted-foreground hover:text-foreground"
                                        onClick={handleReset}
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Reset
                                    </Button>
                                </div>
                            )}
                        </div>
    );
}
