/**
 * Grid Control Helper
 * Business logic for grid controls (search, filter)
 */

import { useGridControlStore } from '@/store/grid/useGridControl.store';
import { Table } from '@tanstack/react-table';

export const useGridControlHelper = () => {
    const {
        table,
        setTable,
        searchQuery,
        setSearchQuery,
        columnFilters,
        setColumnFilters,
        entityName,
        setEntityName,
    } = useGridControlStore();

    /**
     * Register grid table instance and metadata
     * Called by grid components (WsGrid, NoteGrid) on mount/update
     */
    const registerGrid = (
        tableInstance: Table<any>,
        filters: any[],
        filtersSetter: (filters: any[]) => void,
        name: string
    ) => {
        setTable(tableInstance);
        setColumnFilters(filters);
        setEntityName(name);

        // Store the setter for later use
        // We'll use this when clearing filters from header
        (tableInstance as any)._setColumnFilters = filtersSetter;
    };

    /**
     * Unregister grid (cleanup on unmount)
     */
    const unregisterGrid = () => {
        setTable(null);
        setColumnFilters([]);
        setEntityName('');
        setSearchQuery('');
    };

    /**
     * Clear search query
     */
    const clearSearch = () => {
        setSearchQuery('');
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        if (table && (table as any)._setColumnFilters) {
            (table as any)._setColumnFilters([]);
        }
    };

    /**
     * Check if grid is registered
     */
    const isGridActive = () => {
        return table !== null;
    };

    return {
        // State
        table,
        searchQuery,
        columnFilters,
        entityName,

        // Actions
        registerGrid,
        unregisterGrid,
        setSearchQuery,
        clearSearch,
        clearFilters,
        isGridActive,
    };
};
