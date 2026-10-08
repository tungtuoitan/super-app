import { useState, useRef, useEffect } from "react";
import { GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VersionPayload } from "../../types/taskComment.types";
import { getSectionMeta, formatFullDate } from "../../utils/versionComment.utils";
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

    const handleMouseEnter = () => {
        hoverTimeout.current = setTimeout(() => setHoverDiff(true), 300);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHoverDiff(false);
    };

    const handleToggleDiff = () => {
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
    };

    return (
        <div ref={cardRef} className="group space-y-2 rounded-xl border border-sa-border bg-card px-3 py-2">
            <div className="flex h-6 items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5", meta.color)} />

                <div className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <span
                        className={cn("cursor-pointer text-xs font-medium hover:underline", meta.color)}
                        onClick={handleToggleDiff}
                    >
                        {meta.label}
                    </span>

                    {hoverDiff && !showDiff && (
                        <div className="sa-shadow-pop absolute left-0 top-full z-50 mt-1 max-h-[300px] w-[400px] overflow-auto rounded-lg border border-sa-border bg-popover p-2">
                            <SimpleDiff oldText={payload.oldText} newText={payload.newText}
                                oldLabel="Before" newLabel="After" showImageDiff={isHtmlSection} stripHtml={isHtmlSection} />
                        </div>
                    )}
                </div>

                <span className="cursor-default text-[11px] text-muted-foreground" title={formatFullDate(createdAt)}>
                    {timeAgo}
                </span>

                <div className="ml-auto opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                    <button onClick={handleToggleDiff} className={cn(
                        "flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors duration-100",
                        showDiff ? "border-sa-border-strong bg-sa-hover-strong text-foreground !opacity-100"
                            : "border-sa-border text-muted-foreground hover:bg-sa-hover hover:text-foreground",
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
