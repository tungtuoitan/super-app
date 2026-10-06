/**
 * Multi-Project Timeline — bar span resolution (pure functions)
 * Decides where a project/task bar starts and ends when dates are missing:
 *   - no start date  → starts at createdAt (estimated)
 *   - no end date    → open item: runs to the end of the timeline (open-ended)
 *                      closed item (completed/dropped/cancelled/failed): ends at updatedAt (estimated)
 *   - only end date  → 1-day bar at the end date (unchanged behavior)
 * "Closed" is decided by the caller (isStatusNonDraggable) so this file stays dependency-free.
 */

const DAY_MS = 1000 * 60 * 60 * 24;

export interface TimelineSpanItem {
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface TimelineSpan {
    start: Date;
    end: Date;
    /** start comes from createdAt, not a real startDate */
    isStartEstimated: boolean;
    /** end comes from updatedAt (closed item), not a real endDate */
    isEndEstimated: boolean;
    /** no end date and still open → bar runs to the end of the timeline */
    isOpenEnded: boolean;
}

const toDay = (date: Date | string): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const addDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

export const daysBetween = (from: Date, to: Date): number => Math.floor((to.getTime() - from.getTime()) / DAY_MS);

/** Effective span of an item, or null when it has no usable date at all. */
export function resolveTimelineSpan(item: TimelineSpanItem, timelineEnd: Date | null, isClosed: boolean): TimelineSpan | null {
    const { startDate, endDate, createdAt, updatedAt } = item;

    if (endDate) {
        return { start: toDay(startDate || endDate), end: toDay(endDate), isStartEstimated: false, isEndEstimated: false, isOpenEnded: false };
    }

    const startSource = startDate || createdAt;
    if (!startSource) return null;
    const start = toDay(startSource);
    const isStartEstimated = !startDate;

    if (isClosed) {
        const closedAt = updatedAt ? toDay(updatedAt) : start;
        return { start, end: closedAt < start ? start : closedAt, isStartEstimated, isEndEstimated: true, isOpenEnded: false };
    }

    const end = timelineEnd && timelineEnd > start ? toDay(timelineEnd) : start;
    return { start, end, isStartEstimated, isEndEstimated: false, isOpenEnded: true };
}

/**
 * New dates after a drag. Estimated dates become real only where the user touched them:
 *   - move:         shifts real dates; an estimated start becomes real, an open end stays open
 *   - resize-left:  sets the start; the end stays as it was (open stays open)
 *   - resize-right: sets the end (from the drawn end); an estimated start becomes real
 */
export function applyTimelineDrag(
    item: TimelineSpanItem,
    span: TimelineSpan,
    dragType: "move" | "resize-left" | "resize-right",
    daysDeltaLeft: number,
    daysDeltaWidth: number,
): { startDate: Date | null; endDate: Date | null } {
    const realStart = item.startDate ? new Date(item.startDate) : null;
    const realEnd = item.endDate ? new Date(item.endDate) : null;

    if (dragType === "move") {
        const startDate = realStart ? addDays(realStart, daysDeltaLeft) : span.isStartEstimated ? addDays(span.start, daysDeltaLeft) : null;
        const endDate = realEnd ? addDays(realEnd, daysDeltaLeft) : null;
        return { startDate, endDate };
    }

    if (dragType === "resize-left") {
        let startDate = addDays(span.start, daysDeltaLeft);
        if (realEnd && startDate > realEnd) startDate = new Date(realEnd);
        return { startDate, endDate: realEnd };
    }

    const startDate = realStart || new Date(span.start);
    let endDate = addDays(span.end, daysDeltaWidth);
    if (endDate < startDate) endDate = new Date(startDate);
    return { startDate, endDate };
}

/** Bar title (tooltip) explaining estimated / open-ended dates. */
export function describeTimelineSpan(span: TimelineSpan): string | undefined {
    const parts: string[] = [];
    if (span.isStartEstimated) parts.push(`No start date — shown from created date ${span.start.toLocaleDateString()}`);
    if (span.isOpenEnded) parts.push("No end date — ongoing");
    if (span.isEndEstimated) parts.push(`No end date — shown until last update ${span.end.toLocaleDateString()}`);
    return parts.length ? parts.join("\n") : undefined;
}
