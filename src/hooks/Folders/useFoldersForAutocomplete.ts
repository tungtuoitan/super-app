/**
 * Hook to fetch folders and transform them for use in autocomplete components
 * 
 * Note: Backend uses "tag" terminology, frontend uses "folder"
 */

import { useMemo } from 'react';
import { useFolders } from './useFolders';
import type { IAutoCompleteOptions } from '@/shared/components/ui/GenericAutoComplete';
import type { GetFoldersParams } from '../../types/folder.types';

/**
 * Hook that fetches folders from API and transforms them to IAutoCompleteOptions format
 * for use with GenericTagAutoComplete and similar components
 * 
 * @example
 * const { folderOptions, isLoading } = useFoldersForAutocomplete();
 */
export function useFoldersForAutocomplete(params?: GetFoldersParams) {
    // Fetch folders from API
    const { data: folders, isLoading, error } = useFolders({
        isArchived: false, // Only get active folders
        sortBy: 'name',
        sortOrder: 'asc',
        ...params,
    });

    // Transform folders to IAutoCompleteOptions format
    const folderOptions: IAutoCompleteOptions[] = useMemo(() => {
        if (!folders) return [];

        const options = folders.map(folder => ({
            id: folder.tagId.toString(), // Convert to string for consistent comparison
            label: folder.name,
            desc: folder.description || folder.name,
            active: folder.isActive,
            code: folder.tagId.toString(),
            type: 'folder',
            // Optional: include color for visual indicators
            ...(folder.color && { color: folder.color }),
        }));

        console.log('Debug - useFoldersForAutocomplete:', { folders, options });
        return options;
    }, [folders]);

    return {
        folderOptions,
        isLoading,
        error,
        // Return original folders data if needed
        folders,
    };
}

// Legacy export (deprecated)
/** @deprecated Use useFoldersForAutocomplete instead */
export const useTagsForAutocomplete = useFoldersForAutocomplete;
