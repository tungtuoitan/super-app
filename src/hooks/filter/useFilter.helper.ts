/**
 * Filter Helper Hook
 * Business logic for managing user filter preferences
 * Pattern: Separate business logic from store
 */

import { useAuthStore } from "@/store/auth/Auth.store";
import { useAuthHelper } from "@/hooks/useAuth.helpers";
import { constants } from "@/utils/constants";
import type { ViewFilter, UserFilters, FilterValue } from "@/types/common.types";
import { filterUtils } from "@/utils/filter.utils";

/**
 * Filter helper hook for managing filter preferences
 * NO PARAMETERS - Access state via useAuthStore
 * NO useEffect - Components handle timing
 * ONLY function definitions - Return callable functions
 *
 * @returns Object containing filter helper functions
 */
export function useFilterHelper() {
    const { $user } = useAuthStore();
    const { updateUserFilters } = useAuthHelper();

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
    const updateViewFilter = async (filterViewKey: keyof UserFilters, fieldKey: keyof ViewFilter, value: FilterValue): Promise<void> => {
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
     * Toggle a checkbox filter value (add/remove from comma-separated list)
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @param fieldKey Field key (statusCode, deletedAt, etc.)
     * @param value Value to toggle (e.g., "active", "inactive")
     */
    const toggleCheckboxFilter = async (filterViewKey: keyof UserFilters, fieldKey: keyof ViewFilter, value: string): Promise<void> => {
        const currentViewFilter = getViewFilter(filterViewKey);
        const currentValue = currentViewFilter[fieldKey] as FilterValue | undefined;

        // Toggle the value in the comma-separated list
        const newValue = filterUtils._toggleFilterValue(currentValue, value);

        // Update the filter
        await updateViewFilter(filterViewKey, fieldKey, newValue);
    };

    /**
     * Update date range filter
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @param fieldKey Field key (createdAt, updatedAt, etc.)
     * @param from Start date (ISO string or empty)
     * @param to End date (ISO string or empty)
     */
    const updateDateRangeFilter = async (filterViewKey: keyof UserFilters, fieldKey: keyof ViewFilter, from?: string, to?: string): Promise<void> => {
        // Create date range filter value
        const value = filterUtils._createDateRangeFilter(from, to);

        // Update the filter
        await updateViewFilter(filterViewKey, fieldKey, value);
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
     * Check if a specific value is active in a checkbox filter
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @param fieldKey Field key (statusCode, deletedAt, etc.)
     * @param value Value to check (e.g., "active")
     * @returns True if the value is in the filter
     */
    const isCheckboxValueActive = (filterViewKey: keyof UserFilters, fieldKey: keyof ViewFilter, value: string): boolean => {
        const viewFilter = getViewFilter(filterViewKey);
        const filterValue = viewFilter[fieldKey] as FilterValue | undefined;

        if (!filterValue) return false;

        const values = filterValue.split(",").map((v) => v.trim());
        return values.includes(value);
    };

    /**
     * Get date range from a date filter
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @param fieldKey Field key (createdAt, updatedAt, etc.)
     * @returns Object with from and to dates
     */
    const getDateRange = (filterViewKey: keyof UserFilters, fieldKey: keyof ViewFilter): { from?: string; to?: string } => {
        const viewFilter = getViewFilter(filterViewKey);
        const filterValue = viewFilter[fieldKey] as FilterValue | undefined;

        return filterUtils._parseDateRangeFilter(filterValue);
    };

    return {
        getViewFilter,
        updateViewFilter,
        toggleCheckboxFilter,
        updateDateRangeFilter,
        clearViewFilters,
        getActiveFiltersCount,
        isCheckboxValueActive,
        getDateRange,
    };
}
