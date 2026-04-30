/**
 * Task Feature — Filter Configuration
 * Registered to filterRegistry at feature startup
 */

import type { FilterFieldConfig, FilterDefinition } from "@/shell";
import { filterRegistry } from "@/shell";

/**
 * Field configurations for task grid filter
 */
export const TASK_GRID_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "status",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "task_status",
    },
    {
        key: "priority",
        label: "Priority",
        type: "checkbox",
        standardRegistryType: "task_priority",
    },
] as const;

/**
 * Task grid filter definition
 */
export const taskGridFilterDefinition: FilterDefinition = {
    viewKey: "taskGrid",
    featureName: "taskDetail",
    fieldConfigs: TASK_GRID_FILTER_FIELDS,
};

/**
 * Register task filters at feature startup
 */
export function registerTaskFilters() {
    filterRegistry.register(taskGridFilterDefinition);
}
