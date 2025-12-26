/**
 * Generic Filter Helper Hook
 * Business logic for managing generic filter operations
 * Pattern: Separate business logic from component
 */

import { useAuthStore } from "@/store/auth/Auth.store";
import { useAuthHelper } from "@/hooks/useAuth.helpers";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { constants } from "@/utils/constants";
import type { ViewFilter, UserFilters } from "@/types/common.types";
import { filterUtils } from "@/utils/filter.utils";

/**
 * Generic filter helper hook for filter operations
 * NO PARAMETERS - Access state via stores
 * ONLY function definitions - Return callable functions
 *
 * @returns Object containing filter helper functions
 */
export function useGenericFilterHelper() {
    const { $user } = useAuthStore();
    const { updateUserFilters } = useAuthHelper();
    const { filterViewKey, pendingFilters, setPendingFilters } = useGridControlStore();

    /**
     * Get filters for a specific view with defaults applied
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @returns ViewFilter with user preferences or defaults
     */
    const getViewFilter = (filterViewKey: keyof UserFilters): ViewFilter => {
        // Get default filters for this view
        const defaults = constants.filters.defaults[filterViewKey] as ViewFilter;

        // Get user's custom filters
        const userFilters = $user.filters?.[filterViewKey];

        // Merge defaults with user filters (user filters override defaults)
        return filterUtils._mergeFilters(defaults, userFilters);
    };

    /**
     * Update filter for a specific view and field
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @param fieldKey Field key (statusCode, deletedAt, createdAt, etc.)
     * @param value New filter value
     */
    const updateViewFilter = async (filterViewKey: keyof UserFilters, fieldKey: keyof ViewFilter, value: string): Promise<void> => {
        // Get current filters
        const currentFilters: UserFilters = $user.filters || {};

        // Get current view filters
        const currentViewFilters: ViewFilter = currentFilters[filterViewKey] || {};

        // Update the specific field
        const updatedViewFilters: ViewFilter = {
            ...currentViewFilters,
            [fieldKey]: value,
        };

        // Update the entire filters object
        const updatedFilters: UserFilters = {
            ...currentFilters,
            [filterViewKey]: updatedViewFilters,
        };

        // Sync to backend and local state
        await updateUserFilters(updatedFilters);
    };

    /**
     * Clear all filters for a specific view (reset to defaults)
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     */
    const clearViewFilters = async (filterViewKey: keyof UserFilters): Promise<void> => {
        // Get current filters
        const currentFilters: UserFilters = $user.filters || {};

        // Remove the view filters (will fall back to defaults)
        const updatedFilters: UserFilters = {
            ...currentFilters,
            [filterViewKey]: undefined,
        };

        // Sync to backend and local state
        await updateUserFilters(updatedFilters);
    };

    /**
     * Get active filters count for a view
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @returns Number of active filters (beyond defaults)
     */
    const getActiveFiltersCount = (filterViewKey: keyof UserFilters): number => {
        const userFilters = $user.filters?.[filterViewKey];
        if (!userFilters) return 0;

        // Count non-empty filter values
        return Object.values(userFilters).filter((v) => v && v.trim() !== "").length;
    };

    /**
     * Check if value is active in pending filters
     * @param fieldKey Field key
     * @param value Value to check
     * @returns True if the value is active
     */
    const isPendingValueActive = (fieldKey: string, value: string): boolean => {
        const filterValue = (pendingFilters as any)[fieldKey];
        return filterUtils._hasFilterValue(filterValue, value);
    };

    /**
     * Toggle checkbox in local pending state (not saved yet)
     * @param fieldKey Field key
     * @param value Value to toggle
     */
    const handleCheckboxToggle = (fieldKey: string, value: string) => {
        setPendingFilters((prev) => {
            const currentValue = (prev as any)[fieldKey];
            const newValue = filterUtils._toggleFilterValue(currentValue, value);
            return {
                ...prev,
                [fieldKey]: newValue,
            };
        });
    };

    /**
     * Apply pending filters: save to backend
     */
    const handleApply = async () => {
        if (!filterViewKey) return;

        try {
            // Update each field that changed
            for (const [fieldKey, value] of Object.entries(pendingFilters)) {
                await updateViewFilter(filterViewKey, fieldKey as any, value as string);
            }
        } catch (error) {
            console.error("Failed to apply filters:", error);
        }
    };

    /**
     * Clear filters: reset to defaults
     */
    const handleClearFilters = async () => {
        if (!filterViewKey) return;

        try {
            await clearViewFilters(filterViewKey);
            setPendingFilters(getViewFilter(filterViewKey)); // Reset pending to defaults
        } catch (error) {
            console.error("Failed to clear filters:", error);
        }
    };

    return {
        getViewFilter,
        updateViewFilter,
        clearViewFilters,
        getActiveFiltersCount,
        isPendingValueActive,
        handleCheckboxToggle,
        handleApply,
        handleClearFilters,
    };
}