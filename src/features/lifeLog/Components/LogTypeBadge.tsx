/**
 * LogTypeBadge - Icon-only badge for log types
 */

import { cn } from "@/lib/utils";
import { LOG_TYPE_CONFIG, type LogType } from "@/features/lifeLog/types/lifeLog.types";
import { LogTypeIcon } from "./LogTypeIcon";

interface LogTypeBadgeProps {
    type: LogType;
    trackColor?: string;
    className?: string;
}

export function LogTypeBadge({ type, trackColor, className }: LogTypeBadgeProps) {
    const cfg = LOG_TYPE_CONFIG[type] ?? LOG_TYPE_CONFIG.note;
    const color = trackColor ?? cfg.color;

    return (
        <span
            className={cn("inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0", className)}
            style={{ color: color }}
            title={cfg.label}
        >
            <LogTypeIcon type={type} className="w-3.5 h-3.5" />
        </span>
    );
}
