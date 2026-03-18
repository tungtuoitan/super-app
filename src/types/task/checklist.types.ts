/**
 * Checklist Types
 * Domain types for the per-task checklist system.
 */

export interface ChecklistItem {
    name: string;
    isOptional: boolean;
    isChecked: boolean;
    isSkipped: boolean;
}

export interface ChecklistGroup {
    name: string;
    /** Heading level: 1 = #, 2 = ##, 3 = ### (default: 1) */
    level?: number;
    items: ChecklistItem[];
}

export interface ChecklistJSON {
    groups: ChecklistGroup[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
