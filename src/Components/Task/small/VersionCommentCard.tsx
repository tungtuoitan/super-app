import { useState, useRef, useEffect, useCallback } from "react";
import { GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VersionPayload } from "@/types/task/taskComment.types";
import { getSectionMeta, formatFullDate } from "@/utils/task/versionComment.utils";
import { SimpleDiff } from "./SimpleDiff";

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
            <div className="flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5", meta.color)} />

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

                    {hoverDiff && !showDiff && (
                        <div className="absolute left-0 top-full mt-1 z-50 w-[400px] max-h-[300px] overflow-auto rounded border bg-popover shadow-lg p-2">
                            <SimpleDiff oldText={payload.oldText} newText={payload.newText}
                                oldLabel="Before" newLabel="After" showImageDiff={isHtmlSection} stripHtml={isHtmlSection} />
                        </div>
                    )}
                </div>

                <span className="text-[10px] text-muted-foreground cursor-default" title={formatFullDate(createdAt)}>
                    {timeAgo}
                </span>

                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={handleToggleDiff} className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors",
                        showDiff ? "border-primary/40 text-primary bg-primary/10 !opacity-100"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                    )}>
                        <GitCompare className="h-3 w-3" />
                        {showDiff ? "Hide diff" : "Show diff"}
                    </button>
                </div>
            </div>

            {showDiff && (
                <SimpleDiff oldText={payload.oldText} newText={payload.newText}
                    oldLabel="Before" newLabel="After" showImageDiff={isHtmlSection} stripHtml={isHtmlSection}
                    onContentExpand={() => { cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }} />
            )}
        </div>
    );
}
