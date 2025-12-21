/**
 * Workspace List Store
 * Centralized state management for workspace list grid
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import { RowSelectionState, SortingState, ColumnFiltersState } from '@tanstack/react-table';

/**
 * Workspace interface (domain model with Date objects)
 */
export interface Ws {
    id: number;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
    userId?: number;
}

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface WsListContextData {
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
}

export const wsListContextDefaultValue: WsListContextData = {
    workspaces: [],
    isLoading: true,
    error: null,
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 50 },
    rowSelection: {},
    columnFilters: [],
    setWorkspaces: () => {},
    setIsLoading: () => {},
    setError: () => {},
    setSorting: () => {},
    setPagination: () => {},
    setRowSelection: () => {},
    setColumnFilters: () => {},
};

export const WsListStore = createContext<WsListContextData>(wsListContextDefaultValue);

export const useWsListStore = () => useContext(WsListStore);

export const WsListProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [workspaces, setWorkspaces] = useState<Ws[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    return (
        <WsListStore.Provider
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
            }}
        >
            {children}
        </WsListStore.Provider>
    );
};
