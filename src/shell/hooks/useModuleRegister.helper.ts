import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSideBarStore } from "@/shell";
import { moduleRegistry } from "@/shell/moduleRegistry";
import type { UserFilters } from "@/shell";

export const useModuleRegisterHelper = () => {
    const { setModuleName, moduleName, setFilterViewKey, setSearchQuery } = useSideBarStore();

    const getGridConfigFromModuleName = (name: string) => {
        const mod = moduleRegistry.getById(name);
        if (!mod) return null;
        return mod.filterViewKey !== undefined ? { filterViewKey: mod.filterViewKey } : null;
    };

    const registerGrid = () => {
        const config = getGridConfigFromModuleName(moduleName);
        setFilterViewKey(config ? (config.filterViewKey as keyof UserFilters | null) : null);

        return () => {
            setModuleName("");
            setFilterViewKey(null);
            setSearchQuery("");
        };
    };

    return {
        getGridConfigFromModuleName,
        registerGrid,
    };
};
