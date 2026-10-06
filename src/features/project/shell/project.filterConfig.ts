import type { FilterDefinition, FilterFieldConfig } from "@/shell";
import { filterRegistry } from "@/shell";
import { projectConstants } from "@/features/project/project.constants";

export const PROJECT_GRID_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "statusCode",
        label: "Status",
        type: "checkbox",
        standardRegistryType: "project_status",
        optionOrder: projectConstants.optionOrder.projectStatuses,
    },
] as const;

export const projectGridFilterDefinition: FilterDefinition = {
    viewKey: "projectGrid",
    featureName: "project",
    fieldConfigs: PROJECT_GRID_FILTER_FIELDS,
    defaultFilters: { statusCode: "open,in_progress" },
};

export function registerProjectFilters() {
    filterRegistry.register(projectGridFilterDefinition);
}
