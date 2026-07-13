import { useEditorTabBarHelper, shellConstants } from "@/shell";
import { useDailyLogStore } from "../store/useDailyLog.store";
import { useDailyLogDetailStore } from "../store/useDailyLogDetail.store";
import { useDailyLogGridSelector } from "../selectors/useDailyLogGrid.selector";
import { DailyLogDateRangeChip } from "./small/DailyLogDateRangeChip";
import { formatDayMonth, formatIsoDate, isSameLocalDay, startOfLocalDay, addDays } from "../utils/dailyLog.utils";
import type { DailyLogRow } from "../types/dailyLog.types";

function displayDate(d: Date): string {
    const today = startOfLocalDay(new Date());
    if (isSameLocalDay(d, today)) return "Today";
    if (isSameLocalDay(d, addDays(today, -1))) return "Yesterday";
    if (isSameLocalDay(d, addDays(today, 1))) return "Tomorrow";
    return formatDayMonth(d);
}

export function DailyLogGrid() {
    const { isLoading } = useDailyLogStore();
    const { selectedDate, setSelectedDate, isDirty } = useDailyLogDetailStore();
    const { rows } = useDailyLogGridSelector();
    const { openSingletonTab } = useEditorTabBarHelper();

    const onSelect = (row: DailyLogRow) => {
        if (isDirty && selectedDate && !isSameLocalDay(selectedDate, row.logDate)) {
            const ok = window.confirm("Discard unsaved changes?");
            if (!ok) return;
        }
        setSelectedDate(row.logDate);
        const isoDate = formatIsoDate(row.logDate);
        openSingletonTab(
            shellConstants.vscode.tab.tabTypes.dailyLog,
            { title: `Daily · ${displayDate(row.logDate)}` },
            { id: isoDate, logDate: isoDate },
        );
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <DailyLogDateRangeChip />
            <div className="flex-1 overflow-y-auto">
                {isLoading && rows.length === 0 && (
                    <div className="text-xs text-muted-foreground px-3 py-4">Loading…</div>
                )}
                <ul className="divide-y divide-border/50">
                    {rows.map((row) => {
                        const active = selectedDate != null && isSameLocalDay(row.logDate, selectedDate);
                        const isEmpty = row.log == null;
                        return (
                            <li key={row.logDate.getTime()}>
                                <button
                                    onClick={() => onSelect(row)}
                                    className={
                                        "w-full text-left px-3 py-2 flex gap-2 items-start hover:bg-muted/50 " +
                                        (active ? "bg-muted" : "")
                                    }
                                >
                                    <div className="w-16 shrink-0">
                                        <div className={"text-[12px] font-semibold " + (isEmpty ? "text-muted-foreground/60" : "text-foreground")}>
                                            {displayDate(row.logDate)}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground/60">
                                            {formatDayMonth(row.logDate)}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={"text-[12px] truncate " + (isEmpty ? "text-muted-foreground/40 italic" : "text-foreground/80")}>
                                            {row.preview || (isEmpty ? "No log yet" : "(empty)")}
                                        </div>
                                        {row.hasEmotion && (
                                            <div className="mt-0.5">
                                                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                                    emotion
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
