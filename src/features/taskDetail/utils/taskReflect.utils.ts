import { parseInstant } from "@/shared";
import type { IAutoCompleteOptions } from "@/shared";
import { REFLECT_DEFAULT_TYPES, REFLECT_THINK_EDIT_WINDOW_MS } from "../task.constants";
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

/** Rows stored as a plain JSON array string (project `reflectJson`); empty list when absent or invalid */
export function parseReflectList(json: string | null | undefined): ReflectRow[] {
    if (!json) return [];
    try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? (parsed as ReflectRow[]) : [];
    } catch {
        return [];
    }
}

/** Filled rows as a JSON array string, or null when nothing is left */
export function stringifyReflectList(rows: ReflectRow[]): string | null {
    const filled = keepFilledReflectRows(rows);
    return filled.length ? JSON.stringify(filled) : null;
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

/** Number of rows that hold some text (blank rows not counted) */
export function countReflectRows(rows: ReflectRow[]): number {
    return keepFilledReflectRows(rows).length;
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

/** True once a row with a creation time is older than the edit window (rows without one are never locked) */
export function isReflectThinkLocked(row: ReflectRow, nowMs: number): boolean {
    const created = parseInstant(row.createdAt);
    return !!created && nowMs - created.getTime() > REFLECT_THINK_EDIT_WINDOW_MS;
}

/** Splits text at every case-insensitive match of `search`; the pieces alternate non-match / match / non-match... */
export function splitBySearch(text: string, search: string): { text: string; isMatch: boolean }[] {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const needle = search.toLowerCase();
    return text.split(new RegExp(`(${escaped})`, "gi")).map((part) => ({ text: part, isMatch: part.toLowerCase() === needle }));
}

/** True when any column of the row contains `search` (case-insensitive); an empty search matches every row */
export function reflectRowMatchesSearch(row: ReflectRow, search: string): boolean {
    const needle = search.trim().toLowerCase();
    return !needle || [row.type, row.think, row.real].some((v) => v.toLowerCase().includes(needle));
}

/** Sizes a textarea to its content (the Reflect cells grow instead of scrolling) */
export function autoGrowTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
}
