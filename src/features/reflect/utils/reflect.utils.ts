import type { ReflectRow } from "@/features/taskDetail";
import type { ReflectChartPoint, ReflectEntryDTO, ReflectSeriesPointDTO, UpsertReflectEntryRequest } from "../types/reflect.types";

/** A saved row from the server as a sheet row */
export const toReflectRow = (e: ReflectEntryDTO): ReflectRow => ({ id: e.id, type: e.type, think: e.think, real: e.real, updatedAt: e.updatedAt, createdAt: e.createdAt, tag: e.tag ?? undefined });

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

/** The points of a chart as the chart library wants them: the axis shows month-day, the value is kept as is */
export const toReflectChartData = (points: ReflectSeriesPointDTO[]): ReflectChartPoint[] => points.map((p) => ({ label: p.date.slice(5), value: p.value }));

/** The text of a chart tooltip: the value with its unit */
export const formatReflectChartValue = (value: number | string | undefined, unit: string): string => `${value ?? 0} ${unit}`.trim();

/** The tags that exist on some row, sorted (for the tag filter) */
export const reflectTagOptions = (rows: ReflectRow[]): string[] =>
    Array.from(new Set(rows.map((r) => r.tag).filter((t): t is string => !!t))).sort();

/** The rows of one tag; an empty tag keeps every row */
export const filterReflectRowsByTag = (rows: ReflectRow[], tag: string): ReflectRow[] => (tag ? rows.filter((r) => r.tag === tag) : rows);
