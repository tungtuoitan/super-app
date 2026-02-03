/**
 * Project Grid Panel Store
 * Centralized state management for project grid panel
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";

export interface Project {
    id: number;
    name: string;
    description?: string | null;
    status: string;
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
}

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface ProjectContextData {
    projects: Project[];
    setProjects: Dispatch<SetStateAction<Project[]>>;
    totalCount: number;
    setTotalCount: Dispatch<SetStateAction<number>>;
    projectGridIsLoading: boolean;
    setProjectGridIsLoading: Dispatch<SetStateAction<boolean>>;
    projectGridError: Error | null;
    setProjectGridError: Dispatch<SetStateAction<Error | null>>;
    projectGridSorting: SortingState;
    setProjectGridSorting: Dispatch<SetStateAction<SortingState>>;
    projectGridPagination: PaginationState;
    setProjectGridPagination: Dispatch<SetStateAction<PaginationState>>;
    projectGridRowSelection: RowSelectionState;
    setProjectGridRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    projectGridColumnFilters: ColumnFiltersState;
    setProjectGridColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    containerRef: RefObject<HTMLDivElement>;
    containerWidth: number;
    setContainerWidth: Dispatch<SetStateAction<number>>;
}

export const projectContextDefaultValue: ProjectContextData = {
    projects: [],
    totalCount: 0,
    projectGridIsLoading: true,
    projectGridError: null,
    projectGridSorting: [],
    projectGridPagination: { pageIndex: 0, pageSize: 50 },
    projectGridRowSelection: {},
    projectGridColumnFilters: [],
    containerRef: { current: null },
    containerWidth: 0,
    setProjects: () => {},
    setTotalCount: () => {},
    setProjectGridIsLoading: () => {},
    setProjectGridError: () => {},
    setProjectGridSorting: () => {},
    setProjectGridPagination: () => {},
    setProjectGridRowSelection: () => {},
    setProjectGridColumnFilters: () => {},
    setContainerWidth: () => {},
};

export const ProjectStore = createContext<ProjectContextData>(projectContextDefaultValue);

export const useProjectStore = () => useContext(ProjectStore);

export const ProjectProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [projectGridIsLoading, setProjectGridIsLoading] = useState<boolean>(true);
    const [projectGridError, setProjectGridError] = useState<Error | null>(null);
    const [projectGridSorting, setProjectGridSorting] = useState<SortingState>([]);
    const [projectGridPagination, setProjectGridPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [projectGridRowSelection, setProjectGridRowSelection] = useState<RowSelectionState>({});
    const [projectGridColumnFilters, setProjectGridColumnFilters] = useState<ColumnFiltersState>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    return (
        <ProjectStore.Provider
            value={{
                projects,
                setProjects,
                totalCount,
                setTotalCount,
                projectGridIsLoading,
                setProjectGridIsLoading,
                projectGridError,
                setProjectGridError,
                projectGridSorting,
                setProjectGridSorting,
                projectGridPagination,
                setProjectGridPagination,
                projectGridRowSelection,
                setProjectGridRowSelection,
                projectGridColumnFilters,
                setProjectGridColumnFilters,
                containerRef,
                containerWidth,
                setContainerWidth,
            }}
        >
            {children}
        </ProjectStore.Provider>
    );
};
