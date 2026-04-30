/**
 * K Feature — Filter Configuration
 * Registered to filterRegistry at feature startup
 */

import {FilterDefinition, FilterFieldConfig, filterRegistry} from "@/shell";


/**
 * Field configurations for K grid filter
 */
export const K_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "statusCode",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "noteStatus",
    },
    {
        key: "deletedAt",
        label: "Deletion Status",
        type: "checkbox",
    },
] as const;

/**
 * K filter definition
 * Includes custom validation logic specific to K
 */
export const kFilterDefinition: FilterDefinition = {
    viewKey: "k",
    featureName: "K",
    fieldConfigs: K_FILTER_FIELDS,
    validateField: (fieldKey: string, fieldValue: string | undefined): string | null => {
        // Default required validation (field exists but is empty string)
        if (fieldValue !== undefined && (!fieldValue || fieldValue.trim() === "")) {
            return "Required";
        }

        // deletedAt must always include "null" (Existing) — matches original logic
        if (fieldKey === "deletedAt") {
            const values = fieldValue ? fieldValue.split(",").filter((v) => v.trim()) : [];
            if (!values.includes("null")) {
                return "Must include Existing";
            }
        }

        return null;
    },
};

/**
 * Register K filters at feature startup
 */
export function registerKFilters() {
    filterRegistry.register(kFilterDefinition);
}
