/**
 * Grid Control Helper
 * Business logic for grid controls (search, filter)
 * Note: Filters are stored in userProfile and applied on backend
 */

import { useGridControlStore } from "@/store/grid/useGridControl.store";
import type { UserFilters } from "@/types/common.types";

export const useGridControlHelper = () => {
    const { searchQuery, setSearchQuery, moduleName, setModuleName, filterViewKey, setFilterViewKey } = useGridControlStore();

    /**
     * Register grid metadata
     * Called by grid components (WsGrid, NoteGrid) on mount/update
     */
    const registerGrid = (name: string, filterViewKey: keyof UserFilters) => {
        setModuleName(name);
        setFilterViewKey(filterViewKey);
    };

    /**
     * Unregister grid (cleanup on unmount)
     */
    const unregisterGrid = () => {
        setModuleName("");
        setSearchQuery("");
        setFilterViewKey(null);
    };

    return {
        // Actions
        registerGrid,
        unregisterGrid,
    };
};
