import type { DailyLogHistoryPoint } from "../../types/dailyLog.types";
import { addDays, formatDayMonth, isSameLocalDay, startOfLocalDay } from "../../utils/dailyLog.utils";

interface Props {
    points: DailyLogHistoryPoint[];
    /** How many trailing days to render (default 90). */
    days: number;
}

function isTrue(value: string | null | undefined): boolean {
    if (value == null) return false;
    return value === "true" || value === "1" || value.toLowerCase() === "yes";
}

export function DailyLogHistoryHeatmap({ points, days }: Props) {
    const today = startOfLocalDay(new Date());
    const cells: Array<{ date: Date; active: boolean }> = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = addDays(today, -i);
        const p = points.find((pt) => isSameLocalDay(pt.logDate, d));
        cells.push({ date: d, active: p ? isTrue(p.value) : false });
    }

    const trueCount = cells.filter((c) => c.active).length;

    return (
        <div>
            <div className="text-[11px] text-muted-foreground mb-2">
                {trueCount} / {days} days marked
            </div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                {cells.map((c) => (
                    <div
                        key={c.date.getTime()}
                        title={`${formatDayMonth(c.date)}: ${c.active ? "true" : "false"}`}
                        className={"aspect-square rounded-[2px] " + (c.active ? "bg-emerald-500/80" : "bg-muted/60")}
                    />
                ))}
            </div>
        </div>
    );
}
