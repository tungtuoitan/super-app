import type { IAutoCompleteOptions } from "@/shared";
import { REFLECT_DEFAULT_TYPES } from "../task.constants";
import type { ReflectRow } from "../types/taskReflect.types";
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

/** Rows with some text in them, ends trimmed — what gets stored */
export function keepFilledReflectRows(rows: ReflectRow[]): ReflectRow[] {
    return rows
        .map((r) => ({ ...r, type: r.type.trim(), think: r.think.trim(), real: r.real.trim() }))
        .filter((r) => !isReflectRowEmpty(r));
}

/** True when both lists hold the same filled rows (blank rows are ignored) */
export function isSameReflectRows(a: ReflectRow[], b: ReflectRow[]): boolean {
    const left = keepFilledReflectRows(a);
    const right = keepFilledReflectRows(b);
    return left.length === right.length && left.every((r, i) => r.id === right[i].id && r.type === right[i].type && r.think === right[i].think && r.real === right[i].real);
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
