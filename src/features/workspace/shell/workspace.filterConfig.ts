/**
 * Workspace Feature — Filter Configuration
 * Registered to filterRegistry at feature startup
 */

import type { FilterFieldConfig, FilterDefinition } from "@/shell";
import { filterRegistry } from "@/shell";

/**
 * Field configurations for workspace grid filter
 * Defines which filters are available and how they're rendered
 */
export const WORKSPACE_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "statusCode",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "noteStatus",
    },
    {
        key: "createdAt",
        label: "Created Date",
        type: "dateRange",
    },
    {
        key: "updatedAt",
        label: "Updated Date",
        type: "dateRange",
    },
    {
        key: "deletedAt",
        label: "Deletion Status",
        type: "checkbox",
    },
] as const;

/**
 * Workspace filter definition
 * Includes custom validation logic specific to workspace
 */
export const workspaceFilterDefinition: FilterDefinition = {
    viewKey: "workspace",
    featureName: "workspace",
    fieldConfigs: WORKSPACE_FILTER_FIELDS,
    validateField: (fieldKey: string, fieldValue: string | undefined): string | null => {
        // Default required validation (field exists but is empty string)
        if (fieldValue !== undefined && (!fieldValue || fieldValue.trim() === "")) {
            return "Required";
        }

        // deletedAt must always include "null" (Existing) — matches original logic:
        // original checked !filterUtils._hasValue(filterValue, "null") with no truthy guard,
        // so undefined/empty also triggers this error
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
 * Field configurations for workspace folder grid (wsGrid) filter
 */
export const WORKSPACE_FOLDER_GRID_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "statusCode",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "workspaceStatus",
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
 * Workspace folder grid filter definition
 */
export const workspaceFolderGridFilterDefinition: FilterDefinition = {
    viewKey: "wsGrid",
    featureName: "workspace",
    fieldConfigs: WORKSPACE_FOLDER_GRID_FILTER_FIELDS,
};

/**
 * Register workspace filters at feature startup
 * Called from workspace.module.tsx or app initialization
 */
export function registerWorkspaceFilters() {
    filterRegistry.register(workspaceFilterDefinition);
    filterRegistry.register(workspaceFolderGridFilterDefinition);
}
