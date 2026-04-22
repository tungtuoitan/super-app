import type { VersionPayload } from "@/features/task/types/taskComment.types";
import { SECTION_META, FALLBACK_CUSTOM_ICON } from "../task.constants";

/** Try to parse comment content as a version payload */
export function parseVersionComment(content: string): VersionPayload | null {
    try {
        if (!content.startsWith('{"type":"version"')) return null;
        const parsed = JSON.parse(content);
        if (parsed?.type === "version" && parsed.section && typeof parsed.oldText === "string") {
            return parsed as VersionPayload;
        }
    } catch { /* not JSON */ }
    return null;
}

/** Get section meta, with fallback for custom tabs (e.g. "custom:SP Bảng ABC") */
export function getSectionMeta(section: string) {
    if (SECTION_META[section]) return SECTION_META[section];
    const customName = section.startsWith("custom:") ? section.slice(7) : section;
    return { label: `${customName} updated`, icon: FALLBACK_CUSTOM_ICON, color: "text-muted-foreground/70" };
}

export function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullDate(date: Date): string {
    return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
