/**
 * Standard Registry Helper
 * Business logic for loading and managing standard registry data
 * Pattern: Similar to useNoteGridHelper - uses store and service
 */

import { useAuthStore } from "@/shared";
import { parseApiError, isUnauthorizedError } from "../utils/api-error.utils";
import {useConsoleHelper} from "@/shared";
import {keywordService} from "@/shared";
import {useKeywordStore} from "./Keyword.store";


export const useKeywordHelper = () => {
    const { $user } = useAuthStore();
        const {
        setAllKeywords,
        setKeywordsLoading,
        setKeywordsError
    } = useKeywordStore();
    const _console = useConsoleHelper();

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
        loadKeywords,
    };
};
