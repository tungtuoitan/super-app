/**
 * Task Feature — Filter Configuration
 * Registered to filterRegistry at feature startup
 */

import type { FilterFieldConfig, FilterDefinition } from "@/shell";
import { filterRegistry } from "@/shell";
import { projectConstants } from "@/features/project/project.constants";

/**
 * Field configurations for task grid filter
 */
export const TASK_GRID_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "status",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "task_status",
        optionOrder: projectConstants.optionOrder.taskStatuses,
    },
    {
        key: "priority",
        label: "Priority",
        type: "checkbox",
        standardRegistryType: "task_priority",
        optionOrder: projectConstants.optionOrder.taskPriorities,
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
