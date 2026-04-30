/**
 * Grid Auto Register Helper
 * Automatically registers grid controls based on URL route
 * Eliminates need for individual grid components to register themselves
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSideBarStore } from "@/shell";
import { constants } from "@/shared";
import {UserFilters} from "@/shell";

/**
 * Maps URL pathname to grid registration parameters
 */

/**
 * Auto-registers grid based on current route
 * Runs on mount and when URL changes
*/
export const useGridAutoRegisterHelper = () => {
    const location = useLocation();
    const { setModuleName, moduleName, setFilterViewKey, setSearchQuery } = useSideBarStore();
    // const getGridConfigFromPath = (pathname: string) => {
    //     switch (pathname) {
    //         case "/workspace":
    //             return {
    //                 name: constants.modules.workspace,
    //                 filterViewKey: constants.filters.views.workspace as UserFilters,
    //             };
    //         case "/k":
    //         case "/Kworkspace":
    //             return {
    //                 name: constants.modules.k,
    //                 filterViewKey: constants.filters.views.k as UserFilters,
    //             };
    //         case "/ws":
    //             return {
    //                 name: constants.modules.ws,
    //                 filterViewKey: constants.filters.views.wsGrid as UserFilters,
    //             };
    //         case "/notes":
    //             return {
    //                 name: constants.modules.note,
    //                 filterViewKey: constants.filters.views.noteGrid as UserFilters,
    //             };
    //         case "/project":
    //             return {
    //                 name: constants.modules.project,
    //                 filterViewKey: constants.filters.views.projectGrid as UserFilters,
    //             };
    //         case "/lifelog":
    //             return {
    //                 name: "LifeLog",
    //                 filterViewKey: null,
    //             };
    //         default:
    //             return null;
    //     }
    // };

    const getGridConfigFromModuleName = (moduleName: string) => {
        switch (moduleName) {
            case constants.modules.workspace:
                return {
                    // name: constants.modules.workspace,
                    filterViewKey: constants.filters.views.workspace as UserFilters,
                };
            case constants.modules.k:
                return {
                    // name: constants.modules.k,
                    filterViewKey: constants.filters.views.k as UserFilters,
                };
            case constants.modules.ws:
                return {
                    // name: constants.modules.ws,
                    filterViewKey: constants.filters.views.wsGrid as UserFilters,
                };
            case constants.modules.note:
                return {
                    // name: constants.modules.note,
                    filterViewKey: constants.filters.views.noteGrid as UserFilters,
                };
            case constants.modules.project:
                return {
                    // name: constants.modules.project,
                    filterViewKey: constants.filters.views.projectGrid as UserFilters,
                };
            case constants.modules.lifeLog:
                return {
                    // name: "LifeLog",
                    filterViewKey: null,
                };
            default:
                return null;
        }
    };

    const registerGrid = () => {
        const config = getGridConfigFromModuleName(moduleName);
        setFilterViewKey(config ? (config.filterViewKey as keyof UserFilters | null) : null)

        // if (config) {
        //     // Register grid with proper config
        //     setFilterViewKey(config.filterViewKey);

        //     // setModuleName(config.name);
        // } 
        // else {
        //     // Clear registration for non-grid routes
        //     setModuleName("");
        //     setFilterViewKey(null);
        //     setSearchQuery("");
        // }

        // Cleanup: clear on unmount
        return () => {
            setModuleName("");
            setFilterViewKey(null);
            setSearchQuery("");
        };
    }
    
    return {
        getGridConfigFromModuleName,
        registerGrid
    }
};
