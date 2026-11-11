/**
 * Reflect Feature — Filter Configuration
 * Registered to filterRegistry at feature startup
 */

import type { FilterFieldConfig, FilterDefinition } from "@/shell";
import { filterRegistry } from "@/shell";
import { reflectConstants } from "../reflect.constants";

/** Reflect filters on the day the row was created (the filter stores months, the server reads them in the user's timezone) */
export const REFLECT_FILTER_FIELDS: readonly FilterFieldConfig[] = [
    {
        key: "createdAt",
        label: "Created Date",
        type: "dateRange",
    },
] as const;

/** No default: with nothing chosen, every row shows */
export const reflectFilterDefinition: FilterDefinition = {
    viewKey: reflectConstants.filterViewKey,
    featureName: "reflect",
    fieldConfigs: REFLECT_FILTER_FIELDS,
    defaultFilters: {},
};

export function registerReflectFilters() {
    filterRegistry.register(reflectFilterDefinition);
}
