/**
 * Task Reflect types — one row of the Reflect tab (type / what I think / what really happened).
 * Rows are stored inside Task.customTabsJson under the `reflect` key.
 */

export interface ReflectRow {
    id: string;
    /** Free label picked from the autocomplete, e.g. "Plan", "Prediction" */
    type: string;
    /** Written before doing the work */
    think: string;
    /** Written afterwards (by the user or an AI) */
    real: string;
    updatedAt: string;
    /** When the row was first saved; only rows of the Reflect journal set it (it starts the "I think" edit window) */
    createdAt?: string;
    /** Kind of entry set when Claude processed the row (Reflect journal only); read-only */
    tag?: string;
    /** Worth reading: marked by Claude when it processed the row (Reflect journal only); read-only */
    isHighlight?: boolean;
}

export type ReflectField = "type" | "think" | "real";
