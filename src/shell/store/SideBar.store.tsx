/**
 * Grid Control Store
 * Centralized state management for grid controls (search, filter)
 * Shared between sidebar header and grid components
 * Note: Filters are stored in userProfile and applied on backend
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import { shellConstants } from "@/shell/shell.constants";
import {STORAGE_KEYS, storageService} from "@/shared";
import {UserFilters, ViewFilter} from "../genericFilter/filter.types";

export interface SideBarContextData {
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

export const sideBarContextDefaultValue: SideBarContextData = {
    searchQuery: "",
    setSearchQuery: () => {},
    moduleName: "",
    setModuleName: () => {},
    filterViewKey: null,
    setFilterViewKey: () => {},
    uiFilters: {},
    setUIFilters: () => {},
};

export const SideBarStore = createContext<SideBarContextData>(sideBarContextDefaultValue);

export const useSideBarStore = () => useContext(SideBarStore);

export const SideBarProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [moduleName, setModuleName] = useState<string>(storageService.get<string>(`${STORAGE_KEYS.MODULE_NAME}`) ?? "Project");

    const [filterViewKey, setFilterViewKey] = useState<keyof UserFilters | null>(null);
    const [uiFilters, setUIFilters] = useState<ViewFilter>({});

    return (
        <SideBarStore.Provider
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
        </SideBarStore.Provider>
    );
};



