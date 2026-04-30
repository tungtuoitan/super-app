/**
 * KeywordIconRenderer - renders the appropriate icon for a keyword type.
 * - log:   dynamic icon via LogTypeIcon (based on keyword.icon = log type)
 * - track: dynamic icon via TrackIconDisplay (based on keyword.icon = emoji/base64, keyword.color)
 * - rest:  static Lucide icon
 */

import { Layers, Folder, FileText, Link, Hash, Cuboid, SquareCheckBig, ScrollText } from "lucide-react";
import { LogTypeIcon } from "@/features/lifeLog";
import { TrackIconDisplay } from "@/features/lifeLog";
import type { KeywordType } from "@/shared";
import type { LogType } from "@/features/lifeLog";

interface KeywordIconRendererProps {
    type: KeywordType | string;
    icon?: string;
    color?: string;
    /** className applied to Lucide / LogTypeIcon (not TrackIconDisplay which has fixed sizing) */
    className?: string;
}

const STATIC_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    workspace: Layers,
    folder: Folder,
    note: FileText,
    file: FileText,
    project: Cuboid,
    task: SquareCheckBig,
    external: Link,
};

export function KeywordIconRenderer({ type, icon, color, className = "w-4 h-4 flex-shrink-0" }: KeywordIconRendererProps) {
    if (type === "log") {
        if (color) {
            // Track-type log: color is set → use TrackIconDisplay (handles emoji/base64 or Shell fallback)
            return <TrackIconDisplay value={icon} trackColor={color} size="sm" />;
        }
        if (icon) {
            return <LogTypeIcon type={icon as LogType} className={className} />;
        }
        return <ScrollText className={className} />;
    }

    if (type === "track") {
        return <TrackIconDisplay value={icon} trackColor={color} size="sm" />;
    }

    const IconComponent = STATIC_ICON_MAP[type] ?? Hash;
    return <IconComponent className={className} />;
}
