/**
 * TaskGroupHeader — sticky 36px status group header row in the Linear-style task list (#1514).
 */

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatusIcon } from "@/shared";

interface TaskGroupHeaderProps {
    status: string;
    label: string;
    count: number;
    collapsed: boolean;
    colSpan: number;
    onToggle: () => void;
}

export function TaskGroupHeader({ status, label, count, collapsed, colSpan, onToggle }: TaskGroupHeaderProps) {
    return (
        <tr data-group-header>
            <td colSpan={colSpan} className="sticky top-0 z-[5] h-9 p-0">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={!collapsed}
                    className="flex h-9 w-full items-center gap-2 border-y border-sa-border bg-sa-surface px-3 text-left text-[13px] transition-colors duration-100 hover:bg-sa-surface-2"
                >
                    <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-100", !collapsed && "rotate-90")} />
                    <TaskStatusIcon status={status} title={label} />
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{count}</span>
                </button>
            </td>
        </tr>
    );
}
