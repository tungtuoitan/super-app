/**
 * Ws Grid Panel Store
 * Centralized state management for ws grid panel
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import {Ws} from "../../types/workspace.types";

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface WsContextData {
    workspaces: Ws[];
    setWorkspaces: Dispatch<SetStateAction<Ws[]>>;
    totalCount: number;
    setTotalCount: Dispatch<SetStateAction<number>>;
    wsGridIsLoading: boolean;
    setWsGridIsLoading: Dispatch<SetStateAction<boolean>>;
    wsGridError: Error | null;
    setWsGridError: Dispatch<SetStateAction<Error | null>>;
    wsGridSorting: SortingState;
    setWsGridSorting: Dispatch<SetStateAction<SortingState>>;
    wsGridPagination: PaginationState;
    setWsGridPagination: Dispatch<SetStateAction<PaginationState>>;
    wsGridRowSelection: RowSelectionState;
    setWsGridRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    wsGridColumnFilters: ColumnFiltersState;
    setWsGridColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    containerRef: RefObject<HTMLDivElement>;
    containerWidth: number;
    setContainerWidth: Dispatch<SetStateAction<number>>;
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
    setWorkspaces: () => {},
    setTotalCount: () => {},
    setWsGridIsLoading: () => {},
    setWsGridError: () => {},
    setWsGridSorting: () => {},
    setWsGridPagination: () => {},
    setWsGridRowSelection: () => {},
    setWsGridColumnFilters: () => {},
    setContainerWidth: () => {},
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
            }}
        >
            {children}
        </WsStore.Provider>
    );
};
