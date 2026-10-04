/**
 * Date Utilities — SuperApp date handling convention (see .claude/skills/sa-fake-utc/SKILL.md)
 *
 * Two kinds of date values flow between FE and API:
 *
 * 1. INSTANT — a real point in time (createdAt, updatedAt, deletedAt, occurAt,
 *    srsNextReviewAt, expiry...). API returns ISO 8601 WITH offset
 *    ("2026-10-04T09:00:00.000+07:00") and rejects input without one.
 *    → parseInstant / toInstantISO
 *
 * 2. CALENDAR DATE — a day on the calendar, no time, no timezone (task/project
 *    startDate/endDate, logDate, birthday). API returns/accepts "YYYY-MM-DD".
 *    → parseDateOnly / toDateOnly (Date objects at LOCAL midnight)
 *
 * Never use new Date("YYYY-MM-DD") (parsed as UTC midnight → wrong day west of UTC)
 * and never send a calendar date with toISOString() (shifts to the previous day east of UTC).
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Parse an INSTANT string from the API (ISO 8601 with offset) into a Date.
 * @returns Date, or null if input is empty/invalid
 */
export function parseInstant(s?: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Serialize an INSTANT for the API. Uses UTC "Z" — a valid offset the API accepts.
 * @returns ISO 8601 string, or null if input is empty/invalid
 */
export function toInstantISO(d?: Date | null): string | null {
    if (!d || isNaN(d.getTime())) return null;
    return d.toISOString();
}

/**
 * Parse a CALENDAR DATE ("YYYY-MM-DD", extra trailing chars ignored) into a Date at LOCAL midnight.
 * @returns Date at local 00:00, or null if input is empty/invalid
 */
export function parseDateOnly(s?: string | null): Date | null {
    if (!s) return null;
    const match = DATE_ONLY_RE.exec(s.slice(0, 10));
    if (!match) return null;
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Serialize a CALENDAR DATE as "YYYY-MM-DD" using LOCAL year/month/day.
 * @returns "YYYY-MM-DD", or null if input is empty/invalid
 */
export function toDateOnly(d?: Date | null): string | null {
    if (!d || isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
