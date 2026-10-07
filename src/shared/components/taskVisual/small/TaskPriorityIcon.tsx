/**
 * TaskPriorityIcon — 3 small bars (#1514). Filled bars = level; only high is amber
 * (urgent = red). Empty bars follow currentColor at low opacity.
 */

import { cn } from "@/lib/utils";
import { getTaskPriorityVisual } from "../taskVisual.utils";

export interface TaskPriorityIconProps {
    priority: string | null | undefined;
    /** Pixel size (default 14) */
    size?: number;
    className?: string;
    /** Tooltip / accessible label (defaults to the priority code) */
    title?: string;
}

const BARS = [
    { x: 1.5, h: 4 },
    { x: 5.5, h: 7 },
    { x: 9.5, h: 10 },
];

export function TaskPriorityIcon({ priority, size = 14, className, title }: TaskPriorityIconProps) {
    const { color, level } = getTaskPriorityVisual(priority);
    const label = title ?? priority ?? "No priority";

    return (
        <svg width={size} height={size} viewBox="0 0 14 14" role="img" aria-label={label} className={cn("shrink-0", className)}>
            <title>{label}</title>
            {BARS.map(({ x, h }, i) => (
                <rect key={x} x={x} y={12 - h} width="3" height={h} rx="1" fill={i < level ? color : "currentColor"} fillOpacity={i < level ? 1 : 0.22} />
            ))}
        </svg>
    );
}
