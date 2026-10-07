/**
 * TaskListSummary — header card of the Linear-style task list (#1514):
 * project name, per-status counts as coloured dots, 4px progress bar (completed / total).
 */

import { getTaskStatusVisual } from "@/shared";
import type { StatusGroup } from "../../utils/taskGroup.utils";

interface TaskListSummaryProps {
    projectName: string;
    groups: StatusGroup<unknown>[];
    total: number;
    doneCount: number;
    labelOf: (status: string) => string;
}

export function TaskListSummary({ projectName, groups, total, doneCount, labelOf }: TaskListSummaryProps) {
    const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    return (
        <div className="mx-3 mt-3 rounded-xl border border-sa-border bg-card px-4 py-3">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="truncate text-lg font-medium text-foreground">{projectName || "Untitled project"}</h2>
                <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                    {doneCount}/{total} · {percent}%
                </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {groups.map(({ status, items }) => (
                    <span key={status} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTaskStatusVisual(status).color }} />
                        {labelOf(status)}
                        <span className="font-mono text-foreground">{items.length}</span>
                    </span>
                ))}
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-sa-hover-strong">
                <div className="h-full rounded-full bg-sa-good transition-[width] duration-150" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
