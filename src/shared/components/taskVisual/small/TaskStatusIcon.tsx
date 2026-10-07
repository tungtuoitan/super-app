/**
 * TaskStatusIcon — Linear-style status glyph (#1514).
 * open = empty ring · in_progress = half-filled amber · background_progress = ring + dot
 * paused/on_hold = dashed ring · completed = green disc + check · cancelled/failed = disc + x
 */

import { cn } from "@/lib/utils";
import { getTaskStatusVisual } from "../taskVisual.utils";

export interface TaskStatusIconProps {
    status: string | null | undefined;
    /** Pixel size (default 14) */
    size?: number;
    className?: string;
    /** Tooltip / accessible label (defaults to the status code) */
    title?: string;
}

export function TaskStatusIcon({ status, size = 14, className, title }: TaskStatusIconProps) {
    const { color, ink, shape } = getTaskStatusVisual(status);
    const label = title ?? status ?? "status";
    const isDisc = shape === "check" || shape === "cross";

    return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" role="img" aria-label={label} className={cn("shrink-0", className)}>
            <title>{label}</title>
            {isDisc ? (
                <circle cx="7" cy="7" r="6.25" fill={color} />
            ) : (
                <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" strokeDasharray={shape === "dashed" ? "1.73 1.15" : undefined} />
            )}
            {shape === "half" && <path d="M7 3.5 A3.5 3.5 0 0 1 7 10.5 Z" fill={color} />}
            {shape === "dot" && <circle cx="7" cy="7" r="2" fill={color} />}
            {shape === "check" && <path d="M4.4 7.2 L6.2 8.9 L9.6 5.3" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
            {shape === "cross" && <path d="M5 5 L9 9 M9 5 L5 9" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />}
        </svg>
    );
}
