import type { ReflectRow } from "@/features/taskDetail";
import type { ReflectEntryDTO, UpsertReflectEntryRequest } from "../types/reflect.types";

/** A saved row from the server as a sheet row */
export const toReflectRow = (e: ReflectEntryDTO): ReflectRow => ({ id: e.id, type: e.type, think: e.think, real: e.real, updatedAt: e.updatedAt, createdAt: e.createdAt });

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
