/**
 * Standard Registry Helper
 * Business logic for loading and managing standard registry data
 * Pattern: Similar to useNoteGridHelper - uses store and service
 */

import { useSnackbar } from "notistack";
import { useGeneralStore } from "@/shared/store/General.store";
import { standardRegistryService } from "@/shared/services/standardRegistry.service";
import { keywordService } from "@/shared/services/keyword.service";
import { useAuthStore } from "@/shell/store/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { StandardRegistry } from "@/shared/types/standardRegistry.types";
import { IAutoCompleteOptions } from "@/shared/components";
import {useConsoleHelper} from "@/shell/hooks/useConsole.helper";

/**
 * Transform DTO date strings to Date objects
 */
const transformStandardRegistryData = (data: any[]): StandardRegistry[] => {
    return data.map((item) => ({
        ...item,
        createdDate: item.createdDate ? new Date(item.createdDate) : undefined,
        lastModifiedDate: item.lastModifiedDate ? new Date(item.lastModifiedDate) : undefined,
    }));
};

export const useStandardRegistryHelper = () => {
    const { $user } = useAuthStore();
    const {
        registries,
        setRegistries,
        setRegistriesLoading,
        setRegistriesError,
        setAllKeywords,
        setKeywordsLoading,
        setKeywordsError
    } = useGeneralStore();
    const _console = useConsoleHelper();

    /**
     * Load all standard registries from backend
     * Loads ALL registries (no type filter) and stores in global state
     */
    const loadStandardRegistries = async () => {
        try {
            setRegistriesLoading(true);
            const token = $user.userToken;

            // Call API without type filter to get ALL registries
            const result = await standardRegistryService._getStandardRegistries(token, {
                showAll: true,
            });

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || "Failed to load standard registries");
            }

            // Transform dates from API strings to Date objects
            const transformedData = transformStandardRegistryData(result.data || []);
            setRegistries(transformedData);
            setRegistriesError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setRegistriesError(new Error(errorMessage));

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                console.error("Failed to load standard registries:", errorMessage);
            }
        } finally {
            setRegistriesLoading(false);
        }
    };

    /**
     * Load all keywords from backend (workspaces, folders, notes, headings, external links)
     * Stores in global state for markdown editor autocomplete
     */
    const loadKeywords = async () => {
        try {
            setKeywordsLoading(true);
            const token = $user.userToken;

            // Call API to get all keywords
            const keywords = await keywordService._getKeywords(token);

            setAllKeywords(keywords);
            setKeywordsError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setKeywordsError(new Error(errorMessage));

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                console.error("Failed to load keywords:", errorMessage);
            }
        } finally {
            setKeywordsLoading(false);
        }
    };

    return {
        loadStandardRegistries,
        loadKeywords,
    };
};
