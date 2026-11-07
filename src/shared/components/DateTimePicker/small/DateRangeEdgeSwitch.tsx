/**
 * DateRangePicker From / To switch (moved out of DateRangePicker.tsx, unchanged)
 */

import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectionMode } from "../dateRangePicker.type";

interface DateRangeEdgeSwitchProps {
    selectionMode: SelectionMode;
    startDisplayStr: string | null;
    endDisplayStr: string | null;
    focusEdge: (mode: SelectionMode) => void;
}

export function DateRangeEdgeSwitch({ selectionMode, startDisplayStr, endDisplayStr, focusEdge }: DateRangeEdgeSwitchProps) {
    return (
                            <div className="flex items-center gap-1.5 border-b border-sa-border p-2" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                {([["start", "From", startDisplayStr, "bg-sa-good"], ["end", "To", endDisplayStr, "bg-sa-danger"]] as const).map(([mode, label, value, dot], index) => (
                                    <React.Fragment key={mode}>
                                        {index === 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                        <button
                                            type="button"
                                            aria-pressed={selectionMode === mode}
                                            onClick={() => focusEdge(mode)}
                                            className={cn(
                                                "flex min-w-[150px] flex-1 flex-col gap-0.5 rounded-md border px-3 py-1.5 text-left transition-colors duration-100",
                                                selectionMode === mode
                                                    ? "border-sa-border-strong bg-sa-hover-strong text-foreground"
                                                    : "border-transparent text-muted-foreground hover:bg-sa-hover hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
                                                <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                                                {label}
                                            </span>
                                            <span className="text-[13px]">{value || "Not set"}</span>
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
    );
}
