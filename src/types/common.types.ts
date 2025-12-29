/**
 * Common Utility Types
 * Reusable type definitions for props, components, and shared interfaces
 */

import type { CSSProperties, ReactNode } from "react";

/**
 * Component Props
 */

/**
 * Base properties common to most components
 * Provides standard styling and structure props
 */
export interface BaseComponentProps {
    children?: ReactNode;
    style?: CSSProperties;
    className?: string;
}

/**
 * Props for dialog/modal components
 * Extends base props with dialog-specific functionality
 */
export interface DialogProps extends BaseComponentProps {
    open: boolean;
    onClose: () => void;
    title?: string | ReactNode;
}

/**
 * Props for toolbar components
 * Used in grid headers and action bars
 */
export interface ToolbarProps {
    children: ReactNode;
    className?: string;
}

/**
 * Props for grid container components
 * Wrapper for data display grids with ref support
 */
export interface GridContainerProps extends BaseComponentProps {
    ref?: React.Ref<HTMLDivElement>;
}

/**
 * Icon Types
 */

/**
 * Available icon types for the application
 * Used to identify different icon categories in the icon system
 */
export type IconType = "accounts" | "conversation" | "finance" | "folder" | "gratefulList" | "home" | "link" | "library" | "notes" | "sidebar";

/**
 * Props for icon components
 * Generic icon configuration with type and additional props
 */
export interface IconProps {
    code: string;
    type?: IconType;
    props?: any;
}

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
}

/**
 * User-level filter preferences
 * Stores filter configurations for all views
 */
export interface UserFilters {
    noteGrid?: ViewFilter;
    wsGrid?: ViewFilter;
    workspace?: ViewFilter;
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

/**
 * User Profile Types
 */

/**
 * Request payload for updating/upserting user profile
 * Matches backend UpdateUserProfileRequest DTO
 * All fields are optional - only non-null fields will be updated
 */
export interface UpdateUserProfileRequest {
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    dateOfBirth?: string | null; // ISO date string
    gender?: string | null;
    country?: string | null;
    city?: string | null;
    timezone?: string | null;
    language?: string | null;
    filters?: string | null; // JSON string of UserFilters
}

/**
 * API Response Types
 */

/**
 * Standard API response wrapper
 * Matches backend ResultOptions DTO
 */
export interface ResultOptions<T = any> {
    success: boolean;
    message?: string;
    object?: T; // Single object result
    data?: T[]; // Array result
    totalCount?: number; // Total count for pagination
    status?: number;
    reference?: string;
    reference2?: string;
    reference3?: string;
    reference4?: string;
    reference5?: string;
}
