import { useDailyLogStore } from "../../store/useDailyLog.store";
import { dailyLogConstants, type DailyLogDatePresetKey } from "../../dailyLog.constants";
import { addDays, startOfLocalDay } from "../../utils/dailyLog.utils";

function resolvePreset(key: DailyLogDatePresetKey): { from: Date; to: Date } | null {
    const today = startOfLocalDay(new Date());
    switch (key) {
        case "today":     return { from: today, to: today };
        case "yesterday": { const y = addDays(today, -1); return { from: y, to: y }; }
        case "last7":     return { from: addDays(today, -6),  to: today };
        case "last30":    return { from: addDays(today, -29), to: today };
        case "thisMonth": { const start = new Date(today.getFullYear(), today.getMonth(), 1); return { from: start, to: today }; }
        case "custom":    return null;
    }
}

function isRangeActive(range: { from: Date; to: Date } | null, current: { from: Date; to: Date }): boolean {
    if (!range) return false;
    return range.from.getTime() === current.from.getTime() && range.to.getTime() === current.to.getTime();
}

export function DailyLogDateRangeChip() {
    const { dateRange, setDateRange } = useDailyLogStore();

    return (
        <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto">
            {dailyLogConstants.datePresets.map((p) => {
                if (p.key === "custom") return null;
                const range = resolvePreset(p.key);
                const active = isRangeActive(range, dateRange);
                return (
                    <button
                        key={p.key}
                        onClick={() => range && setDateRange(range)}
                        className={
                            "text-[11px] px-2.5 py-1 rounded-full border transition-colors shrink-0 " +
                            (active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border hover:bg-muted")
                        }
                    >
                        {p.label}
                    </button>
                );
            })}
        </div>
    );
}
