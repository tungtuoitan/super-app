/**
 * VersionCommentCard & CollapsibleContent
 *
 * Small UI components used by TaskComment:
 * - CollapsibleContent: truncate long content with "Show more"
 * - VersionCommentCard: display auto-version comments with inline diff
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GitCompare, ChevronDown, ChevronUp, ListOrdered, CheckSquare, FileText, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimpleDiff } from "./SimpleDiff";

// ─── Version payload types ────────────────────────────────────────────────────

export interface VersionPayload {
    type: "version";
    section: "process" | "checklist" | "desc";
    oldText: string;
    newText: string;
}

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

const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    process: { label: "Process updated", icon: ListOrdered, color: "text-muted-foreground/70" },
    checklist: { label: "Checklist updated", icon: CheckSquare, color: "text-muted-foreground/70" },
    desc: { label: "Description updated", icon: FileText, color: "text-muted-foreground/70" },
};

/** Get section meta, with fallback for custom tabs (e.g. "custom:SP Bảng ABC") */
function getSectionMeta(section: string) {
    if (SECTION_META[section]) return SECTION_META[section];
    // Custom tab: section starts with "custom:"
    const customName = section.startsWith("custom:") ? section.slice(7) : section;
    return { label: `${customName} updated`, icon: FilePlus, color: "text-muted-foreground/70" };
}

// ─── Collapsible content wrapper ──────────────────────────────────────────────

const COLLAPSE_HEIGHT = 120;

export function CollapsibleContent({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const timer = setTimeout(() => {
            setIsOverflowing(el.scrollHeight > COLLAPSE_HEIGHT + 20);
        }, 100);
        return () => clearTimeout(timer);
    }, [children]);

    return (
        <div className="relative">
            <div
                ref={ref}
                className={cn(!expanded && isOverflowing && "overflow-hidden")}
                style={!expanded && isOverflowing ? { maxHeight: `${COLLAPSE_HEIGHT}px` } : undefined}
            >
                {children}
            </div>
            {isOverflowing && !expanded && (
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            )}
            {isOverflowing && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                >
                    {expanded ? (
                        <><ChevronUp className="h-3 w-3" /> Show less</>
                    ) : (
                        <><ChevronDown className="h-3 w-3" /> Show more</>
                    )}
                </button>
            )}
        </div>
    );
}

// ─── Shared date utils ────────────────────────────────────────────────────────

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

// ─── Version Comment Card ─────────────────────────────────────────────────────

export function VersionCommentCard({
    payload,
    timeAgo,
    createdAt,
    scrollContainer,
    defaultExpanded = false,
}: {
    payload: VersionPayload;
    timeAgo: string;
    createdAt: Date;
    scrollContainer: HTMLDivElement | null;
    defaultExpanded?: boolean;
}) {
    const [showDiff, setShowDiff] = useState(defaultExpanded);
    const [hoverDiff, setHoverDiff] = useState(false);

    // Sync with parent's showDetail toggle
    useEffect(() => { setShowDiff(defaultExpanded); }, [defaultExpanded]);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const meta = getSectionMeta(payload.section);
    const isHtmlSection = payload.section === "desc" || payload.section.startsWith("custom:");
    const Icon = meta.icon;

    const handleMouseEnter = useCallback(() => {
        hoverTimeout.current = setTimeout(() => setHoverDiff(true), 300);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHoverDiff(false);
    }, []);

    /** Toggle diff and scroll so the card header stays visible */
    const handleToggleDiff = useCallback(() => {
        const nextShow = !showDiff;
        setShowDiff(nextShow);
        setHoverDiff(false);
        if (nextShow && cardRef.current && scrollContainer) {
            requestAnimationFrame(() => {
                const card = cardRef.current;
                if (!card) return;
                const containerRect = scrollContainer.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                if (cardRect.top < containerRect.top) {
                    card.scrollIntoView({ behavior: "smooth", block: "start" });
                } else if (cardRect.bottom > containerRect.bottom) {
                    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            });
        }
    }, [showDiff, scrollContainer]);

    return (
        <div ref={cardRef} className="group rounded border border-border/50 bg-muted/10 px-3 py-2 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5", meta.color)} />

                {/* Title + hover popup wrapper */}
                <div className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <span
                        className={cn("text-xs font-medium cursor-pointer hover:underline", meta.color)}
                        onClick={handleToggleDiff}
                    >
                        {meta.label}
                    </span>

                    {/* Hover diff popup */}
                    {hoverDiff && !showDiff && (
                        <div className="absolute left-0 top-full mt-1 z-50 w-[400px] max-h-[300px] overflow-auto rounded border bg-popover shadow-lg p-2">
                            <SimpleDiff
                                oldText={payload.oldText}
                                newText={payload.newText}
                                oldLabel="Before"
                                newLabel="After"
                                showImageDiff={isHtmlSection}
                                stripHtml={isHtmlSection}
                            />
                        </div>
                    )}
                </div>

                <span
                    className="text-[10px] text-muted-foreground cursor-default"
                    title={formatFullDate(createdAt)}
                >
                    {timeAgo}
                </span>

                {/* Show diff button — only visible on card hover */}
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleToggleDiff}
                        className={cn(
                            "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors",
                            showDiff
                                ? "border-primary/40 text-primary bg-primary/10 !opacity-100"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        )}
                    >
                        <GitCompare className="h-3 w-3" />
                        {showDiff ? "Hide diff" : "Show diff"}
                    </button>
                </div>
            </div>

            {/* Diff (pinned) */}
            {showDiff && (
                <SimpleDiff
                    oldText={payload.oldText}
                    newText={payload.newText}
                    oldLabel="Before"
                    newLabel="After"
                    showImageDiff={isHtmlSection}
                    stripHtml={isHtmlSection}
                    onContentExpand={() => {
                        if (cardRef.current) {
                            cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }
                    }}
                />
            )}
        </div>
    );
}
