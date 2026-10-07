/**
 * Task list grouping utils (#1514) — pure functions, no React.
 */

import { taskGroupConstants } from "../taskGroup.constants";

export interface StatusGroup<T> {
    status: string;
    items: T[];
}

/** Group items by status following taskGroupConstants.order; empty groups are omitted, item order is kept */
export function groupByStatus<T>(items: T[], getStatus: (item: T) => string): StatusGroup<T>[] {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const status = getStatus(item) || "";
        const bucket = map.get(status);
        if (bucket) bucket.push(item);
        else map.set(status, [item]);
    }
    const known = taskGroupConstants.order.filter((s) => map.has(s));
    const others = Array.from(map.keys()).filter((s) => !taskGroupConstants.order.includes(s));
    return [...known, ...others].map((status) => ({ status, items: map.get(status)! }));
}

/** Count items per status */
export function countByStatus<T>(items: T[], getStatus: (item: T) => string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
        const status = getStatus(item) || "";
        counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
}

/** Initial collapsed map: finished groups start collapsed */
export function initialCollapsedGroups(): Record<string, boolean> {
    return Object.fromEntries(taskGroupConstants.collapsedByDefault.map((s) => [s, true]));
}
