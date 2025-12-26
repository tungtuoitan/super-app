/**
 * Filter Utility Functions
 * Helper functions for parsing and manipulating filter values
 */

import { FilterValue, ViewFilter } from "@/types/common.types";

/**
 * Parse comma-separated string into array
 * @param filterValue - Comma-separated string (e.g., "active,inactive")
 * @returns Array of values (e.g., ["active", "inactive"])
 */
const _parseFilterValue = (filterValue?: FilterValue): string[] => {
    if (!filterValue) return [];
    return filterValue.split(",").filter((v) => v.trim() !== "");
};

/**
 * Convert array to comma-separated string
 * @param values - Array of values (e.g., ["active", "inactive"])
 * @returns Comma-separated string (e.g., "active,inactive")
 */
const _stringifyFilterValue = (values: string[]): FilterValue => {
    return values.filter((v) => v.trim() !== "").join(",");
};

/**
 * Check if a filter value contains a specific value
 * @param filterValue - Comma-separated string (e.g., "active,inactive")
 * @param value - Value to check (e.g., "active")
 * @returns True if the filter value contains the value
 */
const _hasFilterValue = (filterValue: FilterValue | undefined, value: string): boolean => {
    const values = _parseFilterValue(filterValue);
    return values.includes(value);
};

/**
 * Add a value to a filter value
 * @param filterValue - Current filter value (e.g., "active")
 * @param value - Value to add (e.g., "inactive")
 * @returns Updated filter value (e.g., "active,inactive")
 */
const _addFilterValue = (filterValue: FilterValue | undefined, value: string): FilterValue => {
    const values = _parseFilterValue(filterValue);
    if (!values.includes(value)) {
        values.push(value);
    }
    return _stringifyFilterValue(values);
};

/**
 * Remove a value from a filter value
 * @param filterValue - Current filter value (e.g., "active,inactive")
 * @param value - Value to remove (e.g., "inactive")
 * @returns Updated filter value (e.g., "active")
 */
const _removeFilterValue = (filterValue: FilterValue | undefined, value: string): FilterValue => {
    const values = _parseFilterValue(filterValue);
    const filteredValues = values.filter((v) => v !== value);
    return _stringifyFilterValue(filteredValues);
};

/**
 * Toggle a value in a filter value
 * @param filterValue - Current filter value (e.g., "active")
 * @param value - Value to toggle (e.g., "inactive")
 * @returns Updated filter value (e.g., "active,inactive" or "active")
 */
const _toggleFilterValue = (filterValue: FilterValue | undefined, value: string): FilterValue => {
    if (_hasFilterValue(filterValue, value)) {
        return _removeFilterValue(filterValue, value);
    }
    return _addFilterValue(filterValue, value);
};

/**
 * Parse date range filter value
 * @param filterValue - Date range string (e.g., "2024-01-01,2024-12-31")
 * @returns Object with from and to dates
 */
const _parseDateRangeFilter = (filterValue?: FilterValue): { from?: string; to?: string } => {
    if (!filterValue) return {};
    const dates = _parseFilterValue(filterValue);
    return {
        from: dates[0] || undefined,
        to: dates[1] || undefined,
    };
};

/**
 * Create date range filter value
 * @param from - Start date (e.g., "2024-01-01")
 * @param to - End date (e.g., "2024-12-31")
 * @returns Date range filter value (e.g., "2024-01-01,2024-12-31")
 */
const _createDateRangeFilter = (from?: string, to?: string): FilterValue => {
    const dates: string[] = [];
    if (from) dates.push(from);
    if (to) dates.push(to);
    return _stringifyFilterValue(dates);
};

/**
 * Check if a view filter is empty (no filters applied)
 * @param viewFilter - View filter object
 * @returns True if no filters are applied
 */
const _isFilterEmpty = (viewFilter?: ViewFilter): boolean => {
    if (!viewFilter) return true;
    return Object.values(viewFilter).every((v) => !v || v.trim() === "");
};

/**
 * Get active filter count for a view
 * @param viewFilter - View filter object
 * @returns Number of active filters
 */
const _getActiveFilterCount = (viewFilter?: ViewFilter): number => {
    if (!viewFilter) return 0;
    return Object.values(viewFilter).filter((v) => v && v.trim() !== "").length;
};

/**
 * Merge default filters with user filters
 * @param defaultFilters - Default filter values
 * @param userFilters - User-defined filter values
 * @returns Merged filter values
 */
const _mergeFilters = (defaultFilters?: ViewFilter, userFilters?: ViewFilter): ViewFilter => {
    return {
        ...defaultFilters,
        ...userFilters,
    };
};

// Export as namespace for compatibility
export const filterUtils = {
    _parseFilterValue,
    _stringifyFilterValue,
    _hasFilterValue,
    _addFilterValue,
    _removeFilterValue,
    _toggleFilterValue,
    _parseDateRangeFilter,
    _createDateRangeFilter,
    _isFilterEmpty,
    _getActiveFilterCount,
    _mergeFilters,
};
