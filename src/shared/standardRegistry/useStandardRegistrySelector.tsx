/**
 * Standard Registry Helper
 * Business logic for loading and managing standard registry data
 * Pattern: Similar to useNoteGridHelper - uses store and service
 */

import {useMemo} from "react";
import {useStandardRegistryStore} from "./StandardRegistry.store";
import {StandardRegistry} from "./standardRegistry.types";


export const useStandardRegistrySelector = () => {
    const { registries, registriesLoading } = useStandardRegistryStore()

    // Group registries by type for easy lookup
    const registriesByType = useMemo(() => {
        const grouped: Record<string, StandardRegistry[]> = {};
        registries.forEach((registry) => {
            if (!grouped[registry.type]) {
                grouped[registry.type] = [];
            }
            grouped[registry.type].push(registry);
        });
        return grouped;
    }, [registries]);
    return {
        registriesByType,
        registriesLoading,
    };
};
