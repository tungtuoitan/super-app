/**
 * Standard Registry Store
 * Centralized state management for standard registry data
 * Pattern: Similar to NoteGridStore - React Context with useState
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useMemo } from "react";
import { StandardRegistry } from "@/types/standardRegistry.types";
import { Keyword } from "@/types/keyword.types";

export interface GeneralContextData {
    // All standard registries loaded from backend (flat array)
    registries: StandardRegistry[];
    setRegistries: Dispatch<SetStateAction<StandardRegistry[]>>;

    // Registries grouped by type (for easy lookup)
    registriesByType: Record<string, StandardRegistry[]>;

    // Loading state
    registriesLoading: boolean;
    setRegistriesLoading: Dispatch<SetStateAction<boolean>>;

    // Error state
    registriesError: Error | null;
    setRegistriesError: Dispatch<SetStateAction<Error | null>>;

    // All keywords (workspaces, folders, notes, headings, external links)
    allKeywords: Keyword[];
    setAllKeywords: Dispatch<SetStateAction<Keyword[]>>;

    // Keywords loading state
    keywordsLoading: boolean;
    setKeywordsLoading: Dispatch<SetStateAction<boolean>>;

    // Keywords error state
    keywordsError: Error | null;
    setKeywordsError: Dispatch<SetStateAction<Error | null>>;
}

export const generalContextDefaultValue: GeneralContextData = {
    registries: [],
    registriesByType: {},
    registriesLoading: true,
    registriesError: null,
    setRegistries: () => {},
    setRegistriesLoading: () => {},
    setRegistriesError: () => {},
    allKeywords: [],
    setAllKeywords: () => {},
    keywordsLoading: true,
    setKeywordsLoading: () => {},
    keywordsError: null,
    setKeywordsError: () => {},
};

export const GeneralStore = createContext<GeneralContextData>(generalContextDefaultValue);

export const useGeneralStore = () => useContext(GeneralStore);

export const GeneralProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [registries, setRegistries] = useState<StandardRegistry[]>([]);
    const [registriesLoading, setRegistriesLoading] = useState<boolean>(true);
    const [registriesError, setRegistriesError] = useState<Error | null>(null);

    const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
    const [keywordsLoading, setKeywordsLoading] = useState<boolean>(true);
    const [keywordsError, setKeywordsError] = useState<Error | null>(null);

    // Group registries by type for easy lookup
    const registriesByType = (() => {
        const grouped: Record<string, StandardRegistry[]> = {};
        registries.forEach((registry) => {
            if (!grouped[registry.type]) {
                grouped[registry.type] = [];
            }
            grouped[registry.type].push(registry);
        });
        return grouped;
    })()

    return (
        <GeneralStore.Provider
            value={{
                registries,
                registriesByType,
                setRegistries,
                registriesLoading,
                setRegistriesLoading,
                registriesError,
                setRegistriesError,
                allKeywords,
                setAllKeywords,
                keywordsLoading,
                setKeywordsLoading,
                keywordsError,
                setKeywordsError,
            }}
        >
            {children}
        </GeneralStore.Provider>
    );
};
