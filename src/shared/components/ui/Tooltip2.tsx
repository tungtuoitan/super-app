import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Tooltip2Props {
    /** Tooltip content */
    title: React.ReactNode;
    /** Element to trigger the tooltip */
    children: React.ReactElement;
    /** Optional additional className for content */
    className?: string;
    /** Tooltip placement */
    placement?: "top" | "right" | "bottom" | "left";
}

/**
 * Enhanced tooltip component with increased maximum width.
 *
 * This component extends the standard shadcn Tooltip with:
 * - Increased max width (500px) for longer content
 * - Same API as standard Tooltip component
 * - Proper class forwarding for styling
 *
 * Use this component when you need to display longer tooltip content
 * that would be truncated in the standard tooltip.
 *
 * @example
 * ```tsx
 * <Tooltip2 title="This is a longer tooltip message that needs more space">
 *   <Button>Hover me</Button>
 * </Tooltip2>
 * ```
 */
export const Tooltip2 = React.forwardRef<HTMLDivElement, Tooltip2Props>(({ title, children, className, placement = "top" }, ref) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent side={placement} className={cn("max-w-[500px]", className)} ref={ref}>
                    {title}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

Tooltip2.displayName = "Tooltip2";
