/**
 * Standard Registry Store
 * Centralized state management for standard registry data
 * Pattern: Similar to NoteGridStore - React Context with useState
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useMemo } from "react";
import {Keyword} from "./keyword.types";

export interface KeywordContextData {
    allKeywords: Keyword[];
    setAllKeywords: Dispatch<SetStateAction<Keyword[]>>;

    // Keywords loading state
    keywordsLoading: boolean;
    setKeywordsLoading: Dispatch<SetStateAction<boolean>>;

    keywordsError: Error | null;
    setKeywordsError: Dispatch<SetStateAction<Error | null>>;
}

export const standardRegistryContextDefaultValue: KeywordContextData = {
    allKeywords: [],
    setAllKeywords: () => {},
    keywordsLoading: true,
    setKeywordsLoading: () => {},
    keywordsError: null,
    setKeywordsError: () => {},
};

export const KeywordStore = createContext<KeywordContextData>(standardRegistryContextDefaultValue);

export const useKeywordStore = () => useContext(KeywordStore);

export const KeywordProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
    const [keywordsLoading, setKeywordsLoading] = useState<boolean>(true);
    const [keywordsError, setKeywordsError] = useState<Error | null>(null);

    return (
        <KeywordStore.Provider
            value={{
                allKeywords,
                setAllKeywords,
                keywordsLoading,
                setKeywordsLoading,
                keywordsError,
                setKeywordsError,
            }}
        >
            {children}
        </KeywordStore.Provider>
    );
};
