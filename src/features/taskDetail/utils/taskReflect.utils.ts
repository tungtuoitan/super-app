import type { IAutoCompleteOptions } from "@/shared";
import { REFLECT_DEFAULT_TYPES } from "../task.constants";
import type { ReflectField, ReflectRow } from "../types/taskReflect.types";
import { parseCustomTabs, serializeCustomTabs } from "./customTab.utils";

export function generateReflectId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createReflectRow(): ReflectRow {
    return { id: generateReflectId(), type: "", think: "", real: "", updatedAt: new Date().toISOString() };
}

/** Rows stored under `reflect` in customTabsJson (empty list when absent or invalid) */
export function parseReflectRows(json: string | null | undefined): ReflectRow[] {
    const { reflect } = parseCustomTabs(json);
    return Array.isArray(reflect) ? reflect : [];
}

/** Write rows back into customTabsJson, keeping the custom tabs untouched */
export function withReflectRows(json: string | null | undefined, rows: ReflectRow[]): string {
    return serializeCustomTabs({ ...parseCustomTabs(json), reflect: rows });
}

export function isReflectRowEmpty(row: ReflectRow): boolean {
    return !row.type.trim() && !row.think.trim() && !row.real.trim();
}

/** New row list after one cell changed; a row the user clears completely is removed */
export function applyReflectCell(rows: ReflectRow[], rowId: string, field: ReflectField, value: string): ReflectRow[] {
    const current = rows.find((r) => r.id === rowId);
    if (!current || current[field] === value) return rows;
    const changed: ReflectRow = { ...current, [field]: value, updatedAt: new Date().toISOString() };
    if (isReflectRowEmpty(changed) && !isReflectRowEmpty(current)) return rows.filter((r) => r.id !== rowId);
    return rows.map((r) => (r.id === rowId ? changed : r));
}

/** Autocomplete options: built-in types plus every type already used in this task */
export function buildReflectTypeOptions(rows: ReflectRow[]): IAutoCompleteOptions[] {
    const seen = new Set<string>();
    return [...REFLECT_DEFAULT_TYPES, ...rows.map((r) => r.type)]
        .filter((t) => {
            const key = t.trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map((t) => ({ id: t, label: t }));
}
