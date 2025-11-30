/**
 * Hook to fetch tags and transform them for use in autocomplete components
 */

import { useMemo } from 'react';
import { useTags } from './useTags';
import type { IAutoCompleteOptions } from '@/shared/components/ui/GenericAutoComplete';
import type { GetFoldersParams as GetTagsParams } from '../../types/folder.types';

/**
 * Hook that fetches tags from API and transforms them to IAutoCompleteOptions format
 * for use with GenericTagAutoComplete and similar components
 */
export function useTagsForAutocomplete(params?: GetTagsParams) {
    // Fetch tags from API
    const { data: tags, isLoading, error } = useTags({
        isArchived: false, // Only get active tags
        sortBy: 'name',
        sortOrder: 'asc',
        ...params,
    });

    // Transform tags to IAutoCompleteOptions format
    const tagOptions: IAutoCompleteOptions[] = useMemo(() => {
        if (!tags) return [];

        const options = tags.map(tag => ({
            id: tag.tagId.toString(), // Convert to string for consistent comparison
            label: tag.name,
            desc: tag.description || tag.name,
            active: tag.isActive,
            code: tag.tagId.toString(),
            type: 'tag',
            // Optional: include color for visual indicators
            ...(tag.color && { color: tag.color }),
        }));

        console.log('Debug - useTagsForAutocomplete:', { tags, options });
        return options;
    }, [tags]);

    return {
        tagOptions,
        isLoading,
        error,
        // Return original tags data if needed
        tags,
    };
}