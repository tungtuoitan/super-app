/**
 * Grid Auto Register Helper
 * Automatically registers grid controls based on URL route
 * Eliminates need for individual grid components to register themselves
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { constants } from "@/utils/index";

/**
 * Maps URL pathname to grid registration parameters
 */

/**
 * Auto-registers grid based on current route
 * Runs on mount and when URL changes
*/
export const useGridAutoRegisterHelper = () => {
    const location = useLocation();
    const { setModuleName, setFilterViewKey, setSearchQuery } = useGridControlStore();
    const getGridConfigFromPath = (pathname: string) => {
        switch (pathname) {
            case "/workspace":
                return {
                    name: constants.modules.workspace,
                    filterViewKey: constants.filters.views.workspace as keyof import("@/types/common.types").UserFilters,
                };
            case "/Kworkspace":
                return {
                    name: constants.modules.Kworkspace,
                    filterViewKey: constants.filters.views.Kworkspace as keyof import("@/types/common.types").UserFilters,
                };
            case "/ws":
                return {
                    name: constants.modules.ws,
                    filterViewKey: constants.filters.views.wsGrid as keyof import("@/types/common.types").UserFilters,
                };
            case "/notes":
                return {
                    name: constants.modules.note,
                    filterViewKey: constants.filters.views.noteGrid as keyof import("@/types/common.types").UserFilters,
                };
            case "/project":
                return {
                    name: constants.modules.project,
                    filterViewKey: constants.filters.views.projectGrid as keyof import("@/types/common.types").UserFilters,
                };
            case "/lifelog":
                return {
                    name: "LifeLog",
                    filterViewKey: null,
                };
            default:
                return null;
        }
    };

    const registerGrid = () => {
        const config = getGridConfigFromPath(location.pathname);

        if (config) {
            // Register grid with proper config
            setModuleName(config.name);
            setFilterViewKey(config.filterViewKey);
        } else {
            // Clear registration for non-grid routes
            setModuleName("");
            setFilterViewKey(null);
            setSearchQuery("");
        }

        // Cleanup: clear on unmount
        return () => {
            setModuleName("");
            setFilterViewKey(null);
            setSearchQuery("");
        };
    }
    
    return {
        getGridConfigFromPath,
        registerGrid
    }
};
