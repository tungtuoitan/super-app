/**
 * Standard Registry Store
 * Centralized state management for standard registry data
 * Pattern: Similar to NoteGridStore - React Context with useState
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useMemo } from "react";
import {StandardRegistry} from "./standardRegistry.types";

export interface StandardRegistryContextData {
    // All standard registries loaded from backend (flat array)
    registries: StandardRegistry[];
    setRegistries: Dispatch<SetStateAction<StandardRegistry[]>>;

    // Loading state
    registriesLoading: boolean;
    setRegistriesLoading: Dispatch<SetStateAction<boolean>>;

    // Error state
    registriesError: Error | null;
    setRegistriesError: Dispatch<SetStateAction<Error | null>>;
}

export const standardRegistryContextDefaultValue: StandardRegistryContextData = {
    registries: [],
    registriesLoading: true,
    registriesError: null,
    setRegistries: () => {},
    setRegistriesLoading: () => {},
    setRegistriesError: () => {},
};

export const StandardRegistryStore = createContext<StandardRegistryContextData>(standardRegistryContextDefaultValue);

export const useStandardRegistryStore = () => useContext(StandardRegistryStore);

export const StandardRegistryProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [registries, setRegistries] = useState<StandardRegistry[]>([]);
    const [registriesLoading, setRegistriesLoading] = useState<boolean>(true);
    const [registriesError, setRegistriesError] = useState<Error | null>(null);

    return (
        <StandardRegistryStore.Provider
            value={{
                registries,
                setRegistries,
                registriesLoading,
                setRegistriesLoading,
                registriesError,
                setRegistriesError,
            }}
        >
            {children}
        </StandardRegistryStore.Provider>
    );
};
