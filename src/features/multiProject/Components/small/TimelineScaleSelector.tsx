import { cn } from "@/lib/utils";
import type { TimelineScale } from "../../types/multiTimeline.type";
import { TIMELINE_SCALE_OPTIONS } from "../../utils/multiTimeline.constants";

interface TimelineScaleSelectorProps {
    value: TimelineScale;
    onChange: (scale: TimelineScale) => void;
}

export function TimelineScaleSelector({ value, onChange }: TimelineScaleSelectorProps) {
    return (
        <div className="flex items-center rounded-md border border-sa-border p-0.5">
            {TIMELINE_SCALE_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "h-6 rounded px-2 text-xs transition-colors",
                        value === option.value ? "bg-sa-hover font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
