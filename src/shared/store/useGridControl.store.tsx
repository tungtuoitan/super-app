/**
 * Grid Control Store
 * Centralized state management for grid controls (search, filter)
 * Shared between sidebar header and grid components
 * Note: Filters are stored in userProfile and applied on backend
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import {constants} from "@/utils/index";
import {STORAGE_KEYS, storageService} from "@/shared/services/storage.service";
import {UserFilters, ViewFilter} from "../types/filter.types";

export interface GridControlContextData {
    // Search query
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;

    // Entity name for labels (e.g., "Workspaces", "Notes")
    moduleName: string;
    setModuleName: Dispatch<SetStateAction<string>>;

    // View key for filters (e.g., "noteGrid", "wsGrid")
    filterViewKey: keyof UserFilters | null;
    setFilterViewKey: Dispatch<SetStateAction<keyof UserFilters | null>>;

    // Pending filters (local state for filter popup)
    uiFilters: ViewFilter;
    setUIFilters: Dispatch<SetStateAction<ViewFilter>>;
}

export const gridControlContextDefaultValue: GridControlContextData = {
    searchQuery: "",
    setSearchQuery: () => {},
    moduleName: "",
    setModuleName: () => {},
    filterViewKey: null,
    setFilterViewKey: () => {},
    uiFilters: {},
    setUIFilters: () => {},
};

export const GridControlStore = createContext<GridControlContextData>(gridControlContextDefaultValue);

export const useGridControlStore = () => useContext(GridControlStore);

export const GridControlProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [moduleName, setModuleName] = useState<string>(storageService.get<string>(`${STORAGE_KEYS.MODULE_NAME}`) ?? constants.modules.project);

    const [filterViewKey, setFilterViewKey] = useState<keyof UserFilters | null>(null);
    const [uiFilters, setUIFilters] = useState<ViewFilter>({});

    return (
        <GridControlStore.Provider
            value={{
                searchQuery,
                setSearchQuery,
                moduleName,
                setModuleName,
                filterViewKey,
                setFilterViewKey,
                uiFilters,
                setUIFilters,
            }}
        >
            {children}
        </GridControlStore.Provider>
    );
};
