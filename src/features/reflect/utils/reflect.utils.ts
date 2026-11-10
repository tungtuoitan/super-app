import type { ReflectRow } from "@/features/taskDetail";
import type { ReflectEntryDTO, UpsertReflectEntryRequest } from "../types/reflect.types";

/** A saved row from the server as a sheet row */
export const toReflectRow = (e: ReflectEntryDTO): ReflectRow => ({ id: e.id, type: e.type, think: e.think, real: e.real, updatedAt: e.updatedAt });

/** True when a row holds no text at all (such a row is deleted, or never stored) */
export const isBlankReflectRow = (r: ReflectRow): boolean => !r.type.trim() && !r.think.trim() && !r.real.trim();

/** What saving a row should do: write it, delete it (cleared but already stored), or nothing */
export const decideReflectSave = (row: ReflectRow, isStored: boolean): "upsert" | "delete" | "skip" => {
    if (!isBlankReflectRow(row)) return "upsert";
    return isStored ? "delete" : "skip";
};

/** The request that writes a row */
export const toReflectUpsertRequest = (row: ReflectRow): UpsertReflectEntryRequest => ({ id: row.id, type: row.type.trim(), think: row.think, real: row.real });
