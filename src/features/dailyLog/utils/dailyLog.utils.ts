import type { DailyLog, DailyLogFieldTemplate, DailyLogValuesMap } from "../types/dailyLog.types";

/** Build the JSON path key used in daily_log.values_json for a template field. */
export function buildFieldPath(section: string, fieldKey: string): string {
    return `${section}.${fieldKey}`;
}

/** Format a Date as "DD-MM" (e.g. 01-07 for July 1). */
export function formatDayMonth(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}`;
}

/** Format a Date as "yyyy-MM-dd" (URL/API safe, local calendar day). */
export function formatIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Return true when both dates fall on the same calendar day (local time). */
export function isSameLocalDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/** Add N days to a Date (immutable). */
export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Return the local start of `date` (00:00:00). */
export function startOfLocalDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Enumerate all dates from `from` to `to` inclusive, ascending. */
export function eachDay(from: Date, to: Date): Date[] {
    const days: Date[] = [];
    let cur = startOfLocalDay(from);
    const end = startOfLocalDay(to);
    while (cur <= end) {
        days.push(cur);
        cur = addDays(cur, 1);
    }
    return days;
}

export function parseValues(valuesJson: string | null | undefined): DailyLogValuesMap {
    if (!valuesJson) return {};
    try {
        const parsed = JSON.parse(valuesJson);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

export function stringifyValues(values: DailyLogValuesMap): string {
    return JSON.stringify(values ?? {});
}

/** Extract a scalar value from a parsed values map. */
export function getFieldValue(values: DailyLogValuesMap, field: Pick<DailyLogFieldTemplate, "section" | "fieldKey">): string | number | boolean | undefined {
    return values[buildFieldPath(field.section, field.fieldKey)];
}

/** Return coerced field value with a safe default per field type. */
export function coerceFieldValue(
    raw: string | number | boolean | undefined,
    fieldType: DailyLogFieldTemplate["fieldType"]
): string | number | boolean {
    if (fieldType === "checkbox") return raw === true || raw === "true";
    if (fieldType === "number" || fieldType === "range") {
        if (typeof raw === "number") return raw;
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    }
    return raw == null ? "" : String(raw);
}

/** Build a short preview string from the log's values_json (used in the grid row). */
export function buildLogPreview(log: DailyLog | null, maxLen: number): string {
    if (!log) return "";
    const values = parseValues(log.valuesJson);
    const raw = values[buildFieldPath("input", "general")];
    if (raw == null) return "";
    const s = String(raw).replace(/\s+/g, " ").trim();
    return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

/** Return true if `output.emotion_note` has a non-empty value. */
export function hasEmotionNote(log: DailyLog | null): boolean {
    if (!log) return false;
    const values = parseValues(log.valuesJson);
    const raw = values[buildFieldPath("output", "emotion_note")];
    return typeof raw === "string" ? raw.trim().length > 0 : Boolean(raw);
}
