import type { ReflectRow } from "@/features/taskDetail";
import type { ReflectChartPoint, ReflectEntryDTO, ReflectSeriesDTO, ReflectShape, UpsertReflectEntryRequest } from "../types/reflect.types";

/** A saved row from the server as a sheet row */
export const toReflectRow = (e: ReflectEntryDTO): ReflectRow => ({ id: e.id, type: e.type, think: e.think, real: e.real, updatedAt: e.updatedAt, createdAt: e.createdAt, tag: e.tag ?? undefined, isHighlight: !!e.isHighlight });

/** True when a row holds no text at all (such a row is deleted, or never stored) */
export const isBlankReflectRow = (r: ReflectRow): boolean => !r.type.trim() && !r.think.trim() && !r.real.trim();

/** What saving a row should do: write it, delete it (cleared but already stored), or nothing */
export const decideReflectSave = (row: ReflectRow, isStored: boolean): "upsert" | "delete" | "skip" => {
    if (!isBlankReflectRow(row)) return "upsert";
    return isStored ? "delete" : "skip";
};

/** The request that writes a row */
export const toReflectUpsertRequest = (row: ReflectRow): UpsertReflectEntryRequest => ({ id: row.id, type: row.type.trim(), think: row.think, real: row.real });

/** The rows with an empty row at the end to type into (made by `makeRow`, added only when the last row has text) */
export const withTrailingBlankReflectRow = (rows: ReflectRow[], makeRow: () => ReflectRow): ReflectRow[] => {
    const last = rows[rows.length - 1];
    return last && isBlankReflectRow(last) ? rows : [...rows, makeRow()];
};

/** The row with its creation time set the first time it gets text */
export const withReflectCreatedAt = (row: ReflectRow, nowIso: string): ReflectRow =>
    row.createdAt || isBlankReflectRow(row) ? row : { ...row, createdAt: nowIso };

/** One value per day: several values of the same day combine the way the metric says (sum, avg or max); points without a number are left out */
export const reflectDailyValues = (series: ReflectSeriesDTO): { date: string; value: number }[] => {
    const byDay = new Map<string, number[]>();
    series.points.forEach((p) => {
        if (p.value !== null) byDay.set(p.date, [...(byDay.get(p.date) ?? []), p.value]);
    });
    return Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, values]) => ({
            date,
            value: series.aggregate === "avg" ? values.reduce((s, v) => s + v, 0) / values.length : series.aggregate === "max" ? Math.max(...values) : values.reduce((s, v) => s + v, 0),
        }));
};

/** How a series is drawn: the stored hint, or a guess from its points when the hint is `auto` */
export const inferReflectShape = (series: ReflectSeriesDTO): Exclude<ReflectShape, "auto"> => {
    if (series.shape !== "auto") return series.shape;
    if (series.points.some((p) => p.item)) return "items";
    const numbers = series.points.filter((p) => p.value !== null).map((p) => p.value as number);
    if (numbers.length === 0) return "list";
    if (numbers.every((v) => v === 0 || v === 1) && series.aggregate === "max") return "flag";
    return series.aggregate === "sum" ? "count" : "level";
};

/** The points of a chart as the chart library wants them: the axis shows month-day */
export const toReflectChartData = (series: ReflectSeriesDTO): ReflectChartPoint[] => reflectDailyValues(series).map((d) => ({ label: d.date.slice(5), value: d.value }));

/** Minutes since midnight as a clock time; past 24 hours wraps to the next day (1470 is 00:30) */
export const formatReflectMinutes = (minutes: number): string => {
    const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Per item (e.g. suggestion sentence): how many times on each day, plus the days in order */
export const reflectItemCounts = (series: ReflectSeriesDTO): { days: string[]; items: { item: string; counts: Record<string, number>; total: number }[] } => {
    const days = Array.from(new Set(series.points.map((p) => p.date))).sort();
    const map = new Map<string, Record<string, number>>();
    series.points.forEach((p) => {
        const key = p.item || series.label;
        const counts = map.get(key) ?? {};
        counts[p.date] = (counts[p.date] ?? 0) + (p.value ?? 1);
        map.set(key, counts);
    });
    const items = Array.from(map.entries()).map(([item, counts]) => ({ item, counts, total: Object.values(counts).reduce((s, v) => s + v, 0) }));
    return { days, items: items.sort((a, b) => b.total - a.total) };
};

/** A flag series as days with a yes or no (a day with only 0 values is a no) */
export const reflectFlagDays = (series: ReflectSeriesDTO): { date: string; on: boolean }[] => reflectDailyValues(series).map((d) => ({ date: d.date, on: d.value > 0 }));


/** The text of a chart tooltip: the value with its unit */
export const formatReflectChartValue = (value: number | string | undefined, unit: string): string => `${value ?? 0} ${unit}`.trim();

/** The tags that exist on some row, sorted (for the tag filter) */
export const reflectTagOptions = (rows: ReflectRow[]): string[] =>
    Array.from(new Set(rows.map((r) => r.tag).filter((t): t is string => !!t))).sort();

/** The rows of one tag; an empty tag keeps every row */
export const filterReflectRowsByTag = (rows: ReflectRow[], tag: string): ReflectRow[] => (tag ? rows.filter((r) => r.tag === tag) : rows);


/** Shown when "Show all" is off: rows marked worth reading, rows written since the journal opened (Claude has not read them yet), and the empty row */
export const isReflectRowShownByDefault = (row: ReflectRow, loadedIds: ReadonlySet<string>): boolean =>
    !!row.isHighlight || !loadedIds.has(row.id) || isBlankReflectRow(row);
