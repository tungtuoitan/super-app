/**
 * Generic Filter Helper Hook
 * Business logic for managing generic filter operations
 * Pattern: Separate business logic from component
 */

import { useAuthStore } from "@/shared";
import { constants } from "@/shared";
import { filterUtils } from "./filter.utils";
import { userProfileService } from "@/shared";
import { envConfig } from "../../config/env.config";
import { STORAGE_KEYS, storageService } from "@/shared";
import { parseApiError } from "../../shared/fetch/api-error.utils";
import {useConsoleHelper} from "@/shared";
import {FilterFieldConfig, UserFilters, ViewFilter} from "./filter.types";
import { filterRegistry } from "./filterRegistry";
import {useSideBarStore} from "@/shell";

/**
 * Generic filter helper hook for filter operations
 * NO PARAMETERS - Access state via stores
 * ONLY function definitions - Return callable functions
 *
 * @returns Object containing filter helper functions
 */
export function useGenericFilterHelper() {
    const { filterViewKey, uiFilters, setUIFilters } = useSideBarStore();
    const _console = useConsoleHelper();
    const { $user, set$User } = useAuthStore();

    /**
     * Update filter for a specific view and field
     * @param filterViewKey View key (noteGrid, wsGrid, workspace)
     * @param fieldKey Field key (statusCode, deletedAt, createdAt, etc.)
     * @param value New filter value
     */
    const applyFilter = async (usingDefaultFilter: boolean = false): Promise<void> => {
        try {
            // ---------
            // STEP 1: Upsert filters to backend
            // ---------
            if (!filterViewKey) {
                throw new Error("Filter view key is not set");
            }
            // Get token from user state
            const token = $user.userToken;
            if (!token) {
                throw new Error("User not authenticated");
            }
            const newUserFilters: UserFilters = $user.filters || (constants.filters.defaults as UserFilters);
            newUserFilters[filterViewKey as keyof UserFilters] = usingDefaultFilter
                ? (constants.filters.defaults[filterViewKey] as ViewFilter) || (constants.filters.defaults as ViewFilter)
                : uiFilters;

            // Update backend - will upsert profile if not exists
            const result = await userProfileService._upsertUserProfile(token, {
                filters: JSON.stringify(newUserFilters), // Convert UserFilters object to JSON string
            });
            if (!result.success) {
                throw new Error(result.message || "Failed to update user filters");
            }
            const newFilters = result.object?.filters;

            // Update local state
            const updatedUser: typeof $user = {
                ...$user,
                filters: newFilters ? JSON.parse(newFilters) : undefined,
            };
            set$User(updatedUser);
            setUIFilters(updatedUser.filters?.[filterViewKey as keyof UserFilters] || (constants.filters.defaults[filterViewKey] as ViewFilter));

            // In dev environment, update localStorage with new filters
            // if (envConfig.NODE_ENV === constants.environments.development) {
                storageService.set(STORAGE_KEYS.USER_PROFILE, updatedUser);
            // }
        } catch (err) {
            const errorMessage = await parseApiError(err);
            _console.error(`Failed to update filters: ${errorMessage}`);
            throw err;
        }
    };

    /**
     * Check if value is active in pending filters
     * @param fieldKey Field key
     * @param value Value to check
     * @returns True if the value is active
     */
    const isPendingValueActive = (fieldKey: string, value: string): boolean => {
        const filterValue = (uiFilters as any)[fieldKey];
        return filterUtils._hasValue(filterValue, value);
    };

    /**
     * Toggle checkbox in local pending state (not saved yet)
     * @param fieldKey Field key
     * @param value Value to toggle
     */
    const handleCheckboxToggle = (fieldKey: string, value: string) => {
        setUIFilters((prev) => {
            const currentValue = (prev as any)[fieldKey];
            const newValue = filterUtils._toggle(currentValue, value);
            return {
                ...prev,
                [fieldKey]: newValue,
            };
        });
    };

    /**
     * Set radio value in local pending state (not saved yet)
     * Unlike checkbox, radio only allows selecting one value
     * @param fieldKey Field key
     * @param value Value to set
     */
    const handleRadioChange = (fieldKey: string, value: string) => {
        setUIFilters((prev) => {
            return {
                ...prev,
                [fieldKey]: value,
            };
        });
    };

    /**
     * Set date range value in local pending state (not saved yet)
     * @param fieldKey Field key
     * @param fromDate Date string in YYYY-MM format
     * @param toDate Date string in YYYY-MM format
     */
    const handleDateRangeChange = (fieldKey: string, fromDate: string, toDate: string) => {
        setUIFilters((prev) => {
            // Store as comma-separated string: "YYYY-MM,YYYY-MM"
            const value = fromDate && toDate ? `${fromDate},${toDate}` : "";
            return {
                ...prev,
                [fieldKey]: value,
            };
        });
    };

    /**
     * Validate pending filters and get field errors
     * Uses filter registry validators for feature-specific validation
     * @returns Record of fieldKey -> error message
     */
    const getFieldErrors = (): Record<string, string> => {
        if (!filterViewKey) return {};

        const errors: Record<string, string> = {};
        const registryConfigs = filterRegistry.getFieldConfigs(filterViewKey);
        const fieldConfigs: readonly FilterFieldConfig[] = registryConfigs.length > 0
            ? registryConfigs
            : (constants.filters.groups as any)[filterViewKey] ?? [];

        fieldConfigs.forEach((fieldConfig) => {
            const filterValue = (uiFilters as any)[fieldConfig.key];

            if (registryConfigs.length > 0) {
                // Use registry validator
                const error = filterRegistry.validateField(filterViewKey, fieldConfig.key, filterValue);
                if (error) errors[fieldConfig.key] = error;
            } else {
                // Fallback: original validation logic
                if (filterValue !== undefined && (!filterValue || filterValue.trim() === "")) {
                    errors[fieldConfig.key] = "Required";
                }
                if (filterViewKey === "workspace" && fieldConfig.key === "deletedAt" && fieldConfig.type === "checkbox") {
                    if (!filterUtils._hasValue(filterValue, "null")) {
                        errors[fieldConfig.key] = "Must include Existing";
                    }
                }
                if (filterViewKey === "k" && fieldConfig.key === "deletedAt" && fieldConfig.type === "checkbox") {
                    if (!filterUtils._hasValue(filterValue, "null")) {
                        errors[fieldConfig.key] = "Must include Existing";
                    }
                }
            }
        });

        return errors;
    };

    /**
     * Check if Apply button should be disabled
     * @returns True if there are validation errors
     */
    const isApplyDisabled = (): boolean => {
        const errors = getFieldErrors();
        return Object.keys(errors).length > 0;
    };

    return {
        isPendingValueActive,

        handleCheckboxToggle,
        handleRadioChange,
        handleDateRangeChange,

        applyFilter,
        getFieldErrors,
        isApplyDisabled,
    };
}
