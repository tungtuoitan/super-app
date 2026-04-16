/**
 * Grid Control Store
 * Centralized state management for grid controls (search, filter)
 * Shared between sidebar header and grid components
 * Note: Filters are stored in userProfile and applied on backend
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import type { UserFilters, ViewFilter } from "@/types/common.types";
import {constants} from "@/utils/index";
import {STORAGE_KEYS, storageService} from "@/services/storage.service";
import type { Project } from "@/types/project.types";

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

    // Current project context (set by project feature when a project is opened)
    projectId: number | null;
    setProjectId: Dispatch<SetStateAction<number | null>>;
    currentProject: Project | null;
    setCurrentProject: Dispatch<SetStateAction<Project | null>>;
    projects: Project[];
    setProjects: Dispatch<SetStateAction<Project[]>>;
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
    projectId: null,
    setProjectId: () => {},
    currentProject: null,
    setCurrentProject: () => {},
    projects: [],
    setProjects: () => {},
};

export const GridControlStore = createContext<GridControlContextData>(gridControlContextDefaultValue);

export const useGridControlStore = () => useContext(GridControlStore);

export const GridControlProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [moduleName, setModuleName] = useState<string>(storageService.get<string>(`${STORAGE_KEYS.MODULE_NAME}`) ?? constants.modules.project);

    const [filterViewKey, setFilterViewKey] = useState<keyof UserFilters | null>(null);
    const [uiFilters, setUIFilters] = useState<ViewFilter>({});
    const [projectId, setProjectId] = useState<number | null>(null);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

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
                projectId,
                setProjectId,
                currentProject,
                setCurrentProject,
                projects,
                setProjects,
            }}
        >
            {children}
        </GridControlStore.Provider>
    );
};
