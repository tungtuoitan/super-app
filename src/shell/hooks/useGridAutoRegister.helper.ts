/**
 * Grid Auto Register Helper
 * Automatically registers grid controls based on URL route
 * Eliminates need for individual grid components to register themselves
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSideBarStore } from "@/shell";
import { shellConstants } from "@/shell/shell.constants";
import { projectConstants } from "@/features/project/project.constants";
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
    //                 name: "Workspace",
    //                 filterViewKey: projectConstants.filters.views.workspace as UserFilters,
    //             };
    //         case "/k":
    //         case "/Kworkspace":
    //             return {
    //                 name: "K",
    //                 filterViewKey: projectConstants.filters.views.k as UserFilters,
    //             };
    //         case "/ws":
    //             return {
    //                 name: "Ws",
    //                 filterViewKey: projectConstants.filters.views.wsGrid as UserFilters,
    //             };
    //         case "/notes":
    //             return {
    //                 name: "Note",
    //                 filterViewKey: projectConstants.filters.views.noteGrid as UserFilters,
    //             };
    //         case "/project":
    //             return {
    //                 name: "Project",
    //                 filterViewKey: projectConstants.filters.views.projectGrid as UserFilters,
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
            case "Workspace":
                return {
                    // name: "Workspace",
                    filterViewKey: projectConstants.filters.views.workspace as UserFilters,
                };
            case "K":
                return {
                    // name: "K",
                    filterViewKey: projectConstants.filters.views.k as UserFilters,
                };
            case "Ws":
                return {
                    // name: "Ws",
                    filterViewKey: projectConstants.filters.views.wsGrid as UserFilters,
                };
            case "Note":
                return {
                    // name: "Note",
                    filterViewKey: projectConstants.filters.views.noteGrid as UserFilters,
                };
            case "Project":
                return {
                    // name: "Project",
                    filterViewKey: projectConstants.filters.views.projectGrid as UserFilters,
                };
            case "LifeLog":
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





