/**
 * SectionTitle — small uppercase section heading used across the task detail page (#1514).
 * Optional right-side actions (icon buttons) are passed as children.
 */

import { Loader2 } from "lucide-react";

export function SectionTitle({
    title,
    isLoading,
    children,
}: {
    title: string;
    isLoading?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex h-7 items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {children && <div className="ml-auto flex items-center gap-0.5">{children}</div>}
        </div>
    );
}
