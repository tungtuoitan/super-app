/**
 * Note Feature — Filter Configuration
 * Registered to filterRegistry at feature startup
 */

import type { FilterFieldConfig, FilterDefinition } from "@/shell";
import { filterRegistry } from "@/shell";

/**
 * Field configurations for note grid filter
 */
export const NOTE_GRID_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "statusCode",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "noteStatus",
    },
    {
        key: "deletedAt",
        label: "Deletion Status",
        type: "radio",
    },
    {
        key: "createdAt",
        label: "Created Date",
        type: "dateRange",
    },
] as const;

/**
 * Note grid filter definition
 */
export const noteGridFilterDefinition: FilterDefinition = {
    viewKey: "noteGrid",
    featureName: "note",
    fieldConfigs: NOTE_GRID_FILTER_FIELDS,
    defaultFilters: { statusCode: "active", deletedAt: "null" },
};

/**
 * Register note filters at feature startup
 */
export function registerNoteFilters() {
    filterRegistry.register(noteGridFilterDefinition);
}
