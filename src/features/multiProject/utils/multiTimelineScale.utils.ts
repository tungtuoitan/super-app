/**
 * Multi-Project Timeline — header columns for coarse scales (pure functions)
 * Groups consecutive days into bottom columns (week/month/quarter/year) and top groups
 * (month/year/decade). Widths are days * pxPerDay so bars and header stay aligned.
 */

import type { TimelineHeaderCell, TimelineScale, TimelineScaleHeader } from "../types/multiTimeline.type";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };

const mondayOf = (d: Date) => { const r = startOfDay(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };

const quarterOf = (d: Date) => Math.floor(d.getMonth() / 3) + 1;

interface ScaleSpec {
    columnKey: (d: Date) => string;
    columnLabel: (first: Date) => string;
    columnTitle: (first: Date, last: Date) => string;
    groupKey: (d: Date) => string;
    groupLabel: (first: Date) => string;
}

const SPECS: Record<Exclude<TimelineScale, "day">, ScaleSpec> = {
    week: {
        columnKey: (d) => mondayOf(d).toDateString(),
        columnLabel: (f) => `${f.getDate()}`,
        columnTitle: (f, l) => `${f.toLocaleDateString()} – ${l.toLocaleDateString()}`,
        groupKey: (d) => `${d.getFullYear()}-${d.getMonth()}`,
        groupLabel: (f) => `${MONTHS[f.getMonth()]} ${f.getFullYear()}`,
    },
    month: {
        columnKey: (d) => `${d.getFullYear()}-${d.getMonth()}`,
        columnLabel: (f) => MONTHS[f.getMonth()],
        columnTitle: (f) => `${MONTHS[f.getMonth()]} ${f.getFullYear()}`,
        groupKey: (d) => `${d.getFullYear()}`,
        groupLabel: (f) => `${f.getFullYear()}`,
    },
    quarter: {
        columnKey: (d) => `${d.getFullYear()}-Q${quarterOf(d)}`,
        columnLabel: (f) => `Q${quarterOf(f)}`,
        columnTitle: (f) => `Q${quarterOf(f)} ${f.getFullYear()}`,
        groupKey: (d) => `${d.getFullYear()}`,
        groupLabel: (f) => `${f.getFullYear()}`,
    },
    year: {
        columnKey: (d) => `${d.getFullYear()}`,
        columnLabel: (f) => `${f.getFullYear()}`,
        columnTitle: (f) => `${f.getFullYear()}`,
        groupKey: (d) => `${Math.floor(d.getFullYear() / 10)}`,
        groupLabel: (f) => `${Math.floor(f.getFullYear() / 10) * 10}s`,
    },
};

export function buildScaleHeader(dates: Date[], scale: Exclude<TimelineScale, "day">, pxPerDay: number): TimelineScaleHeader {
    const spec = SPECS[scale];
    const today = startOfDay(new Date());
    const columns: TimelineHeaderCell[] = [];
    const groups: TimelineHeaderCell[] = [];
    let colKey = "";
    let grpKey = "";

    dates.forEach((date, i) => {
        const ck = spec.columnKey(date);
        if (ck !== colKey) {
            colKey = ck;
            let end = i;
            while (end + 1 < dates.length && spec.columnKey(dates[end + 1]) === ck) end++;
            const last = dates[end];
            const next = dates[end + 1];
            columns.push({
                label: spec.columnLabel(date),
                title: spec.columnTitle(date, last),
                width: (end - i + 1) * pxPerDay,
                isCurrent: today >= startOfDay(date) && today <= startOfDay(last),
                isMajor: !!next && spec.groupKey(next) !== spec.groupKey(date),
            });
        }
        const gk = spec.groupKey(date);
        if (gk !== grpKey) {
            grpKey = gk;
            groups.push({ label: spec.groupLabel(date), width: pxPerDay });
        } else {
            groups[groups.length - 1].width += pxPerDay;
        }
    });

    return { groups, columns };
}

/** Minimum range (days) so the timeline is ~2.5 viewports wide and can scroll at this scale */
export function getMinRangeDays(viewportWidth: number, pxPerDay: number): number {
    return Math.ceil(Math.max(viewportWidth, 1200) * 2.5 / pxPerDay);
}

/** Days to add when scrolling hits an edge — at least `baseDays`, or ~400px worth at coarse scales */
export function getExtendDays(pxPerDay: number, baseDays: number): number {
    return Math.max(baseDays, Math.ceil(400 / pxPerDay));
}
