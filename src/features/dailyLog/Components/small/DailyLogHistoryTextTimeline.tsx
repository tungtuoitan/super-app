import { useState } from "react";
import type { DailyLogHistoryPoint } from "../../types/dailyLog.types";
import { formatDayMonth } from "../../utils/dailyLog.utils";

interface Props {
    points: DailyLogHistoryPoint[];
}

export function DailyLogHistoryTextTimeline({ points }: Props) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const filtered = q ? points.filter((p) => p.value?.toLowerCase().includes(q)) : points;

    const highlight = (text: string) => {
        if (!q) return text;
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark className="bg-yellow-500/30 text-inherit">{text.slice(idx, idx + q.length)}</mark>
                {text.slice(idx + q.length)}
            </>
        );
    };

    const sorted = [...filtered].sort((a, b) => b.logDate.getTime() - a.logDate.getTime());

    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search value…"
                className="w-full px-2 py-1.5 mb-3 text-sm rounded border border-border bg-background"
            />
            <div className="space-y-2">
                {sorted.map((p, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                        <div className="w-16 shrink-0 text-[11px] font-mono text-muted-foreground pt-0.5">
                            {formatDayMonth(p.logDate)}
                        </div>
                        <div className="flex-1 whitespace-pre-wrap text-foreground/85">
                            {highlight(p.value ?? "")}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
