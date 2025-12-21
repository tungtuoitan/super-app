/**
 * Grid Control Store
 * Centralized state management for grid controls (search, filter)
 * Shared between sidebar header and grid components
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import { Table } from '@tanstack/react-table';

export interface GridControlContextData {
    // Table instance from the active grid
    table: Table<any> | null;
    setTable: Dispatch<SetStateAction<Table<any> | null>>;

    // Search query
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;

    // Column filters (passed from grid)
    columnFilters: any[];
    setColumnFilters: Dispatch<SetStateAction<any[]>>;

    // Entity name for labels (e.g., "Workspaces", "Notes")
    entityName: string;
    setEntityName: Dispatch<SetStateAction<string>>;
}

export const gridControlContextDefaultValue: GridControlContextData = {
    table: null,
    setTable: () => {},
    searchQuery: '',
    setSearchQuery: () => {},
    columnFilters: [],
    setColumnFilters: () => {},
    entityName: '',
    setEntityName: () => {},
};

export const GridControlStore = createContext<GridControlContextData>(gridControlContextDefaultValue);

export const useGridControlStore = () => useContext(GridControlStore);

export const GridControlProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [table, setTable] = useState<Table<any> | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [columnFilters, setColumnFilters] = useState<any[]>([]);
    const [entityName, setEntityName] = useState<string>('');

    return (
        <GridControlStore.Provider
            value={{
                table,
                setTable,
                searchQuery,
                setSearchQuery,
                columnFilters,
                setColumnFilters,
                entityName,
                setEntityName,
            }}
        >
            {children}
        </GridControlStore.Provider>
    );
};
