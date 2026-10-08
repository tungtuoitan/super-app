/**
 * PropertyChip — compact Linear-style property control for the task detail header (#1514).
 * Wraps an existing shared control (StatusAutoComplete, DateRangePicker, GenericAutoComplete…)
 * and flattens its trigger button into a 28px chip. The wrapper is a <label>, so clicking the
 * leading icon forwards the click to the wrapped trigger button — no logic is duplicated.
 */

import { cn } from "@/lib/utils";

export function PropertyChip({
    icon,
    title,
    className,
    children,
}: {
    icon?: React.ReactNode;
    title?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <label
            title={title}
            className={cn(
                "inline-flex h-7 max-w-[260px] min-w-0 cursor-pointer items-center rounded-md text-[13px] text-foreground transition-colors duration-100 hover:bg-sa-hover",
                "has-[button:disabled]:cursor-default has-[button:disabled]:hover:bg-transparent",
                icon ? "gap-0.5 pl-2" : "",
                // Flatten the wrapped trigger into the chip
                "[&_button]:h-7 [&_button]:w-auto [&_button]:min-w-0 [&_button]:max-w-[240px] [&_button]:gap-1.5 [&_button]:rounded-md [&_button]:border-0",
                "[&_button]:bg-transparent [&_button]:pr-2 [&_button]:text-[13px] [&_button]:font-normal [&_button:hover]:bg-transparent",
                icon ? "[&_button]:pl-1" : "[&_button]:pl-2",
                "[&_.lucide-chevrons-up-down]:hidden",
                className,
            )}
        >
            {icon}
            {children}
        </label>
    );
}
