import { useMemo } from "react";
import { useDailyLogStore } from "../store/useDailyLog.store";
import type { DailyLog, DailyLogRow } from "../types/dailyLog.types";
import { dailyLogConstants } from "../dailyLog.constants";
import { buildLogPreview, hasEmotionNote, isSameLocalDay, startOfLocalDay } from "../utils/dailyLog.utils";

/**
 * Derive rows from actual logs in the date range, plus a placeholder for today
 * (so the user can always start a new log today). Days without a log — except today —
 * are omitted to avoid rendering rows for dates the user never used the app.
 * Rows are returned descending (latest first).
 */
export const useDailyLogGridSelector = () => {
    const { logs, dateRange } = useDailyLogStore();

    const rows: DailyLogRow[] = useMemo(() => {
        const today = startOfLocalDay(new Date());
        const inRange = (d: Date) => d >= startOfLocalDay(dateRange.from) && d <= startOfLocalDay(dateRange.to);

        const logRows: DailyLogRow[] = logs
            .filter((l) => inRange(l.logDate))
            .map((log) => ({
                logDate: startOfLocalDay(log.logDate),
                log: log as DailyLog,
                preview: buildLogPreview(log, dailyLogConstants.previewLength),
                hasEmotion: hasEmotionNote(log),
            }));

        // Ensure today always appears (even if no log yet) — but only if today falls in range.
        if (inRange(today) && !logRows.some((r) => isSameLocalDay(r.logDate, today))) {
            logRows.push({ logDate: today, log: null, preview: "", hasEmotion: false });
        }

        logRows.sort((a, b) => b.logDate.getTime() - a.logDate.getTime());
        return logRows;
    }, [logs, dateRange.from, dateRange.to]);

    return { rows };
};
