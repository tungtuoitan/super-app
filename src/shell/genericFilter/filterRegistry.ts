/**
 * Filter Registry — Feature-Specific Filter Configuration
 *
 * Shell (GenericFilterPopup, useGenericFilterHelper) does NOT import features directly.
 * Instead, each feature registers FilterDefinition here at startup.
 * Shell reads from this registry at render/validation time.
 *
 * Dependency direction:
 *   features/xxx/shell/xxx.filterConfig.ts  →  filterRegistry  ←  shell/components
 */

import type { FilterFieldConfig } from "./filter.types";

export interface FilterDefinition {
    /** View key (e.g., "workspace", "noteGrid", "k", "taskGrid") */
    viewKey: string;

    /** Feature that owns this filter view */
    featureName: string;

    /** Field configurations for this view */
    fieldConfigs: readonly FilterFieldConfig[];

    /** Custom validator for specific fields - called from useGenericFilterHelper */
    validateField?: (fieldKey: string, fieldValue: string | undefined, fieldConfig: FilterFieldConfig) => string | null;

    /** Custom renderer component for specific fields */
    renderField?: (
        fieldConfig: FilterFieldConfig,
        fieldValue: string | undefined,
        onValueChange: (fieldKey: string, value: string) => void
    ) => React.ReactNode;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const _registry: FilterDefinition[] = [];

export const filterRegistry = {
    register(def: FilterDefinition): void {
        const existingIndex = _registry.findIndex((f) => f.viewKey === def.viewKey);
        if (existingIndex >= 0) {
            _registry[existingIndex] = def;
            return;
        }
        _registry.push(def);
    },

    getAll(): FilterDefinition[] {
        return _registry;
    },

    getByViewKey(viewKey: string): FilterDefinition | undefined {
        return _registry.find((f) => f.viewKey === viewKey);
    },

    getFieldConfigs(viewKey: string): readonly FilterFieldConfig[] {
        return this.getByViewKey(viewKey)?.fieldConfigs ?? [];
    },

    /**
     * Validate a single field using registered validator
     * Returns error message or null if valid
     */
    validateField(viewKey: string, fieldKey: string, fieldValue: string | undefined): string | null {
        const filterDef = this.getByViewKey(viewKey);
        if (!filterDef) return null;

        const fieldConfig = filterDef.fieldConfigs.find((f) => f.key === fieldKey);
        if (!fieldConfig) return null;

        // Call custom validator if available
        if (filterDef.validateField) {
            return filterDef.validateField(fieldKey, fieldValue, fieldConfig);
        }

        // Default validation: required fields
        if (fieldValue !== undefined && (!fieldValue || fieldValue.trim() === "")) {
            return "Required";
        }

        return null;
    },

    /**
     * Get custom renderer for a field, if registered
     * Returns null if no custom renderer — shell will use default
     */
    getFieldRenderer(viewKey: string, fieldKey: string): FilterDefinition["renderField"] | null {
        const filterDef = this.getByViewKey(viewKey);
        return filterDef?.renderField ?? null;
    },
};
