/**
 * Ws List Store
 * Centralized state management for ws list grid
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";

/**
 * Workspace interface (domain model with Date objects)
 */
export interface Ws {
    id: number;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt: Date | null;
    isHardDeleted?: boolean;
    userId?: number;
}

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface WsContextData {
    workspaces: Ws[];
    setWorkspaces: Dispatch<SetStateAction<Ws[]>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    error: Error | null;
    setError: Dispatch<SetStateAction<Error | null>>;
    sorting: SortingState;
    setSorting: Dispatch<SetStateAction<SortingState>>;
    pagination: PaginationState;
    setPagination: Dispatch<SetStateAction<PaginationState>>;
    rowSelection: RowSelectionState;
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    columnFilters: ColumnFiltersState;
    setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    selectedWs: Ws | null;
    setSelectedWs: Dispatch<SetStateAction<Ws | null>>;
}

export const wsContextDefaultValue: WsContextData = {
    workspaces: [],
    isLoading: true,
    error: null,
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 50 },
    rowSelection: {},
    columnFilters: [],
    selectedWs: null,
    setWorkspaces: () => {},
    setIsLoading: () => {},
    setError: () => {},
    setSorting: () => {},
    setPagination: () => {},
    setRowSelection: () => {},
    setColumnFilters: () => {},
    setSelectedWs: () => {},
};

export const WsStore = createContext<WsContextData>(wsContextDefaultValue);

export const useWsStore = () => useContext(WsStore);

export const WsProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [workspaces, setWorkspaces] = useState<Ws[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [selectedWs, setSelectedWs] = useState<Ws | null>(null);

    return (
        <WsStore.Provider
            value={{
                workspaces,
                setWorkspaces,
                isLoading,
                setIsLoading,
                error,
                setError,
                sorting,
                setSorting,
                pagination,
                setPagination,
                rowSelection,
                setRowSelection,
                columnFilters,
                setColumnFilters,
                selectedWs,
                setSelectedWs,
            }}
        >
            {children}
        </WsStore.Provider>
    );
};
