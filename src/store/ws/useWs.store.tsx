/**
 * Ws List Store
 * Centralized state management for ws list grid
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";

/**
 * Workspace interface (domain model with Date objects)
 */
export interface Ws {
    id: number;
    name: string;
    description?: string | null;
    statusCode?: string; // Workspace status code (matches Note pattern)
    hashtags?: string; // Hashtags string (matches Note pattern)
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt: Date | null;
    isHardDeleted?: boolean;
    userId?: number;
    createdBy?: string; // User who created the workspace
}

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface WsContextData {
    workspaces: Ws[];
    setWorkspaces: Dispatch<SetStateAction<Ws[]>>;
    totalCount: number;
    setTotalCount: Dispatch<SetStateAction<number>>;
    wsGridIsLoading: boolean; // Renamed to match NoteGrid pattern
    setWsGridIsLoading: Dispatch<SetStateAction<boolean>>;
    wsGridError: Error | null; // Renamed to match NoteGrid pattern
    setWsGridError: Dispatch<SetStateAction<Error | null>>;
    wsGridSorting: SortingState; // Renamed to match NoteGrid pattern
    setWsGridSorting: Dispatch<SetStateAction<SortingState>>;
    wsGridPagination: PaginationState; // Renamed to match NoteGrid pattern
    setWsGridPagination: Dispatch<SetStateAction<PaginationState>>;
    wsGridRowSelection: RowSelectionState; // Renamed to match NoteGrid pattern
    setWsGridRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    wsGridColumnFilters: ColumnFiltersState; // Renamed to match NoteGrid pattern
    setWsGridColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    containerRef: RefObject<HTMLDivElement>;
    containerWidth: number;
    setContainerWidth: Dispatch<SetStateAction<number>>;
    selectedWs: Ws | null;
    setSelectedWs: Dispatch<SetStateAction<Ws | null>>;
}

export const wsContextDefaultValue: WsContextData = {
    workspaces: [],
    totalCount: 0,
    wsGridIsLoading: true,
    wsGridError: null,
    wsGridSorting: [],
    wsGridPagination: { pageIndex: 0, pageSize: 50 },
    wsGridRowSelection: {},
    wsGridColumnFilters: [],
    containerRef: { current: null },
    containerWidth: 0,
    selectedWs: null,
    setWorkspaces: () => {},
    setTotalCount: () => {},
    setWsGridIsLoading: () => {},
    setWsGridError: () => {},
    setWsGridSorting: () => {},
    setWsGridPagination: () => {},
    setWsGridRowSelection: () => {},
    setWsGridColumnFilters: () => {},
    setContainerWidth: () => {},
    setSelectedWs: () => {},
};

export const WsStore = createContext<WsContextData>(wsContextDefaultValue);

export const useWsStore = () => useContext(WsStore);

export const WsProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [workspaces, setWorkspaces] = useState<Ws[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [wsGridIsLoading, setWsGridIsLoading] = useState<boolean>(true);
    const [wsGridError, setWsGridError] = useState<Error | null>(null);
    const [wsGridSorting, setWsGridSorting] = useState<SortingState>([]);
    const [wsGridPagination, setWsGridPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [wsGridRowSelection, setWsGridRowSelection] = useState<RowSelectionState>({});
    const [wsGridColumnFilters, setWsGridColumnFilters] = useState<ColumnFiltersState>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [selectedWs, setSelectedWs] = useState<Ws | null>(null);

    return (
        <WsStore.Provider
            value={{
                workspaces,
                setWorkspaces,
                totalCount,
                setTotalCount,
                wsGridIsLoading,
                setWsGridIsLoading,
                wsGridError,
                setWsGridError,
                wsGridSorting,
                setWsGridSorting,
                wsGridPagination,
                setWsGridPagination,
                wsGridRowSelection,
                setWsGridRowSelection,
                wsGridColumnFilters,
                setWsGridColumnFilters,
                containerRef,
                containerWidth,
                setContainerWidth,
                selectedWs,
                setSelectedWs,
            }}
        >
            {children}
        </WsStore.Provider>
    );
};
