/**
 * LogTypeIcon - renders the Lucide icon for a given LogType
 */

import {
    Zap,
    SquareDashedMousePointer,
    MessageCircle,
    GraduationCap,
    ThumbsDown,
    NotebookPen,
    Scan,
    LoaderCircle,
    type LucideProps,
} from "lucide-react";
import { LOG_TYPE_CONFIG } from "@/types/lifeLog.types";
import type { LogType } from "@/types/lifeLog.types";

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
    Zap,
    SquareDashedMousePointer,
    MessageCircle,
    GraduationCap,
    ThumbsDown,
    NotebookPen,
    Scan,
    LoaderCircle,
};

interface LogTypeIconProps extends Omit<LucideProps, "color"> {
    type: LogType;
    /** override icon color, defaults to config color */
    color?: string;
}

export function LogTypeIcon({ type, color, ...props }: LogTypeIconProps) {
    const cfg = LOG_TYPE_CONFIG[type];
    if (!cfg) return null;
    const Icon = ICON_MAP[cfg.lucideIcon] ?? NotebookPen;
    return <Icon style={{ color: color ?? cfg.color }} {...props} />;
}
