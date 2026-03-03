/**
 * Generic Filter Helper Hook
 * Business logic for managing generic filter operations
 * Pattern: Separate business logic from component
 */

import { useAuthStore } from "@/store/auth/Auth.store";
import { useAuthHelper } from "@/hooks/useAuth.helpers";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { constants } from "@/utils/constants";
import type { ViewFilter, UserFilters, FilterFieldConfig, UpdateUserProfileRequest } from "@/types/common.types";
import { filterUtils } from "@/utils/filter.utils";
import { useSnackbar } from "notistack";
import { userProfileService } from "@/services/userProfile.service";
import { envConfig } from "../config";
import { STORAGE_KEYS, storageService } from "@/services/storage.service";
import { parseApiError } from "../utils";
import { set } from "lodash";
import {useConsoleHelper} from "./console/useConsole.helper";

/**
 * Generic filter helper hook for filter operations
 * NO PARAMETERS - Access state via stores
 * ONLY function definitions - Return callable functions
 *
 * @returns Object containing filter helper functions
 */
export function useGenericFilterHelper() {
    const { filterViewKey, uiFilters, setUIFilters } = useGridControlStore();
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
     * A field is invalid if it exists in pending filters but has no values selected
     * @returns Record of fieldKey -> error message
     */
    const getFieldErrors = (): Record<string, string> => {
        if (!filterViewKey) return {};

        const errors: Record<string, string> = {};
        const fieldConfigs = (constants.filters.groups as any)[filterViewKey] as readonly FilterFieldConfig[];

        fieldConfigs.forEach((fieldConfig) => {
            const filterValue = (uiFilters as any)[fieldConfig.key];

            // Check if field exists in pending filters but is empty
            if (filterValue !== undefined && (!filterValue || filterValue.trim() === "")) {
                errors[fieldConfig.key] = "Required";
            }

            // Special validation for workspace deletedAt (checkbox type)
            // Must always include "null" (Existing)
            if (filterViewKey === "workspace" && fieldConfig.key === "deletedAt" && fieldConfig.type === "checkbox") {
                if (!filterUtils._hasValue(filterValue, "null")) {
                    errors[fieldConfig.key] = "Must include Existing";
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
