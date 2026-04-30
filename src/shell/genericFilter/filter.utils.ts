/**
 * Filter Utility Functions
 * Helper functions for parsing and manipulating filter values
 */

import {FilterValue} from "@/shell";


/**
 * Parse comma-separated string into array
 * @param filterValue - Comma-separated string (e.g., "active,inactive")
 * @returns Array of values (e.g., ["active", "inactive"])
 */
const _parse = (filterValue?: FilterValue): string[] => {
    if (!filterValue) return [];
    return filterValue.split(",").filter((v) => v.trim() !== "");
};

/**
 * Convert array to comma-separated string
 * @param values - Array of values (e.g., ["active", "inactive"])
 * @returns Comma-separated string (e.g., "active,inactive")
 */
const _stringify = (values: string[]): FilterValue => {
    return values.filter((v) => v.trim() !== "").join(",");
};

/**
 * Check if a filter value contains a specific value
 * @param filterValue - Comma-separated string (e.g., "active,inactive")
 * @param value - Value to check (e.g., "active")
 * @returns True if the filter value contains the value
 */
const _hasValue = (filterValue: FilterValue | undefined, value: string): boolean => {
    const values = _parse(filterValue);
    return values.includes(value);
};

/**
 * Add a value to a filter value
 * @param filterValue - Current filter value (e.g., "active")
 * @param value - Value to add (e.g., "inactive")
 * @returns Updated filter value (e.g., "active,inactive")
 */
const _add = (filterValue: FilterValue | undefined, value: string): FilterValue => {
    const values = _parse(filterValue);
    if (!values.includes(value)) {
        values.push(value);
    }
    return _stringify(values);
};

/**
 * Remove a value from a filter value
 * @param filterValue - Current filter value (e.g., "active,inactive")
 * @param value - Value to remove (e.g., "inactive")
 * @returns Updated filter value (e.g., "active")
 */
const _remove = (filterValue: FilterValue | undefined, value: string): FilterValue => {
    const values = _parse(filterValue);
    const filteredValues = values.filter((v) => v !== value);
    return _stringify(filteredValues);
};

/**
 * Toggle a value in a filter value
 * @param filterValue - Current filter value (e.g., "active")
 * @param value - Value to toggle (e.g., "inactive")
 * @returns Updated filter value (e.g., "active,inactive" or "active")
 */
const _toggle = (filterValue: FilterValue | undefined, value: string): FilterValue => {
    if (_hasValue(filterValue, value)) {
        return _remove(filterValue, value);
    }
    return _add(filterValue, value);
};

/**
 * Parse date range filter value
 * @param filterValue - Date range string (e.g., "2024-01-01,2024-12-31")
 * @returns Object with from and to dates
 */
const _parseDateRange = (filterValue?: FilterValue): { from?: string; to?: string } => {
    if (!filterValue) return {};
    const dates = _parse(filterValue);
    return {
        from: dates[0] || undefined,
        to: dates[1] || undefined,
    };
};




// Export as namespace for compatibility
export const filterUtils = {
    _parse,
    _stringify,
    _hasValue,
    _add,
    _remove,
    _toggle,
    _parseDateRange,
};
