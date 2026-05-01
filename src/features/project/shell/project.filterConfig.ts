import type { FilterDefinition, FilterFieldConfig } from "@/shell";
import { filterRegistry } from "@/shell";

export const PROJECT_GRID_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "statusCode",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "project_status",
    },
] as const;

export const projectGridFilterDefinition: FilterDefinition = {
    viewKey: "projectGrid",
    featureName: "project",
    fieldConfigs: PROJECT_GRID_FILTER_FIELDS,
    defaultFilters: { statusCode: "active" },
};

export function registerProjectFilters() {
    filterRegistry.register(projectGridFilterDefinition);
}
