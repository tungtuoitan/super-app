/**
 * Checklist Types
 * Domain types for the per-task checklist system.
 */

export type ChecklistType = "testcase" | "checklist" | "repeat-checklist";

export interface EnvCheckState {
    isChecked: boolean;
    isSkipped: boolean;
}

export interface ChecklistItem {
    name: string;
    isOptional: boolean;
    isChecked: boolean;
    isSkipped: boolean;
    /** Per-environment state — only used when checklistType === "testcase" */
    envStates?: Record<string, EnvCheckState>;
    /** Marks the last item of a sub-group — parser pops back to parent after this item */
    isGroupEnd?: boolean;
}

export interface ChecklistGroup {
    name: string;
    /** Heading level: 1 = #, 2 = ##, 3 = ### (default: 1) */
    level?: number;
    items: ChecklistItem[];
    /** Continuation of a parent group after a sub-group was closed with -- */
    isContinuation?: boolean;
}

export interface ChecklistJSON {
    /** Type of checklist — default "checklist" if undefined (backward compat) */
    checklistType?: ChecklistType;
    groups: ChecklistGroup[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
