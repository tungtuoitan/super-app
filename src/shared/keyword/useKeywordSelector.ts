/**
 * Standard Registry Helper
 * Business logic for loading and managing standard registry data
 * Pattern: Similar to useNoteGridHelper - uses store and service
 */

import {useKeywordStore} from "./Keyword.store";

export const useKeywordSelector = () => {
    const { allKeywords } = useKeywordStore();


    return {
        allKeywords
    };
};
