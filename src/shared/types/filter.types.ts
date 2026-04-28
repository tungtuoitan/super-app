



/**
 * Filter Types
 */

/**
 * Filter value type - comma-separated string for multi-select filters
 * Examples: "active,inactive" or "01,02,05" or "2024-01-01,2024-12-31"
 */
export type FilterValue = string;

/**
 * View-specific filter configuration
 * Contains filter values for different fields in a specific view (noteGrid, wsGrid, workspace)
 */
export interface ViewFilter {
    statusCode?: FilterValue; // e.g., "active,inactive"
    createdAt?: FilterValue; // e.g., "2024-01-01,2024-12-31"
    updatedAt?: FilterValue; // e.g., "2024-01-01,2024-12-31"
    deletedAt?: FilterValue; // e.g., "null" or "notNull"
    status?: FilterValue; // task status, e.g., "open,in_progress"
    priority?: FilterValue; // task priority, e.g., "low,medium,high"
}

/**
 * User-level filter preferences
 * Stores filter configurations for all views
 */
export interface UserFilters {
    noteGrid?: ViewFilter;
    wsGrid?: ViewFilter;
    workspace?: ViewFilter;
    k?: ViewFilter;
    projectGrid?: ViewFilter;
    taskGrid?: ViewFilter;
}

/**
 * Filter field configuration
 * Defines how each filter field should be rendered and processed
 */
export interface FilterFieldConfig {
    key: string; // Field name (e.g., "statusCode", "createdAt")
    label: string; // Display label (e.g., "Status", "Created Date")
    type: "checkbox" | "radio" | "dateRange" | "text"; // Filter UI type
    standardRegistryType?: string; // If type=checkbox, which standard registry to use
    defaultValue?: FilterValue; // Default filter value
}

