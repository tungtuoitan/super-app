import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLLAPSE_HEIGHT } from "../../types/versionComment.constants";

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
        <div>
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
            </div>
            {isOverflowing && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="relative z-10 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
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
