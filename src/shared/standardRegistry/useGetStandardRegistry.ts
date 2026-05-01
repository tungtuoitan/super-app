/**
 * Standard Registry Helper
 * Business logic for loading and managing standard registry data
 * Pattern: Similar to useNoteGridHelper - uses store and service
 */

import {useStandardRegistrySelector} from "./useStandardRegistrySelector";


export const useGetStandardRegistry = (type: string) => {
    const { registriesByType} = useStandardRegistrySelector()

    const registries = registriesByType[type] || [];

    return registries
};
