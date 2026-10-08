/**
 * PanelToggleButton — opens/closes the bottom panel (Console + module panels) (#1514).
 * Shows how many console messages arrived since last seen; red dot when one of them is an error.
 * Opening with unread messages jumps straight to the Console tab.
 */

import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsoleHelper, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { useActivityBarStore } from "../../store/ActivityBar.store";
import { getUnreadConsole } from "../../utils/panel.utils";

interface PanelToggleButtonProps {
    /** "rail": 48px icon button (collapsed sidebar); "compact": 28px icon button (sidebar footer) */
    variant?: "rail" | "compact";
    side?: "right" | "top";
}

export function PanelToggleButton({ variant = "compact", side = "top" }: PanelToggleButtonProps) {
    const { isPanelVisible, setIsPanelVisible, consoleSeenId, setPanelTabRequest } = useActivityBarStore();
    const { messages } = useConsoleHelper();
    const { count, hasError } = getUnreadConsole(messages, consoleSeenId);

    const toggle = () => {
        if (!isPanelVisible && count > 0) setPanelTabRequest("console");
        setIsPanelVisible((v) => !v);
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={isPanelVisible ? "Hide panel" : "Show panel"}
                        aria-pressed={isPanelVisible}
                        className={cn(
                            "relative flex items-center justify-center transition-colors duration-100",
                            variant === "rail" ? "h-12 w-12" : "h-7 w-7 rounded-md hover:bg-sa-hover-strong",
                            isPanelVisible ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground",
                        )}
                    >
                        <Terminal className={variant === "rail" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={1.75} />
                        {count > 0 && !isPanelVisible && (
                            <span
                                className={cn(
                                    "absolute flex min-w-[14px] h-[14px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold leading-none",
                                    variant === "rail" ? "top-2 right-1.5" : "-top-1 -right-1",
                                    hasError ? "bg-sa-danger text-background" : "bg-sa-surface-2 text-foreground border border-sa-border-strong",
                                )}
                            >
                                {count > 99 ? "99+" : count}
                            </span>
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side={side}>
                    <p>{isPanelVisible ? "Hide panel" : "Show panel"} <span className="font-mono text-muted-foreground">Ctrl J</span></p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
