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
    /** Kind of entry set by the nightly scan (Reflect journal only); read-only */
    tag?: string;
}

export type ReflectField = "type" | "think" | "real";
