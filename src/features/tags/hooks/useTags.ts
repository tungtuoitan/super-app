/**
 * Tag React Query Hooks
 * Data fetching hooks following the same pattern as notes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagService } from '../services/tagService';
import type { 
    Tag, 
    CreateTagDTO, 
    UpdateTagDTO, 
    GetTagsParams 
} from '../types/tag.types';

// Query Keys
export const tagKeys = {
    all: ['tags'] as const,
    lists: () => [...tagKeys.all, 'list'] as const,
    list: (params?: GetTagsParams) => [...tagKeys.lists(), params] as const,
    tree: () => [...tagKeys.all, 'tree'] as const,
    workspaceTree: (workspaceId: number) => 
        [...tagKeys.all, 'workspace', workspaceId, 'tree'] as const,
    details: () => [...tagKeys.all, 'detail'] as const,
    detail: (id: number) => [...tagKeys.details(), id] as const,
    depth: (depth: number) => [...tagKeys.all, 'depth', depth] as const,
    roots: () => [...tagKeys.all, 'roots'] as const,
};

/**
 * Hook to fetch all tags with optional filtering
 */
export function useTags(params?: GetTagsParams) {
    return useQuery({
        queryKey: tagKeys.list(params),
        queryFn: () => tagService.getTags(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * REMOVED: useTagTree hook
 * Old /tree endpoint is deprecated. Use useWorkspaceTagTree(workspaceId) instead.
 */

/**
 * Hook to fetch workspace tag tree with hierarchy
 */
export function useWorkspaceTagTree(workspaceId: number) {
    return useQuery({
        queryKey: tagKeys.workspaceTree(workspaceId),
        queryFn: () => tagService.getWorkspaceTagTree(workspaceId),
        staleTime: 5 * 60 * 1000,
        enabled: workspaceId > 0, // Only fetch if ID is valid
    });
}

/**
 * Hook to fetch single tag by ID
 */
export function useTag(id: number, enabled = true) {
    return useQuery({
        queryKey: tagKeys.detail(id),
        queryFn: () => tagService.getTagById(id),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to fetch tags at a specific depth level
 */
export function useTagsByDepth(depth: number, enabled = true) {
    return useQuery({
        queryKey: tagKeys.depth(depth),
        queryFn: () => tagService.getTagsByDepth(depth),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to fetch root level tags only
 */
export function useRootTags() {
    return useQuery({
        queryKey: tagKeys.roots(),
        queryFn: () => tagService.getRootTags(),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to create new tag
 */
export function useCreateTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: CreateTagDTO) => tagService.createTag(data),
        onSuccess: (newTag) => {
            // Invalidate all tag queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: tagKeys.all });
            
            // Also specifically invalidate tree queries since hierarchy may have changed
            queryClient.invalidateQueries({ queryKey: tagKeys.tree() });
            
            // If the tag has a parent, invalidate queries for that depth level
            if (newTag && (newTag.depth || 0) > 0) {
                queryClient.invalidateQueries({ queryKey: tagKeys.depth(newTag.depth || 0) });
                queryClient.invalidateQueries({ queryKey: tagKeys.roots() });
            }
        },
    });
}

/**
 * Hook to update existing tag
 */
export function useUpdateTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTagDTO }) =>
            tagService.updateTag(id, data),
        onSuccess: (_, { id }) => {
            // Invalidate specific tag and related queries
            queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
            queryClient.invalidateQueries({ queryKey: tagKeys.tree() });
        },
    });
}

/**
 * Hook to delete tag
 */
export function useDeleteTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => tagService.deleteTag(id),
        onSuccess: () => {
            // Invalidate all tag queries
            queryClient.invalidateQueries({ queryKey: tagKeys.all });
        },
    });
}

/**
 * Hook to archive tag
 */
export function useArchiveTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => tagService.archiveTag(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
            queryClient.invalidateQueries({ queryKey: tagKeys.tree() });
        },
    });
}

/**
 * Hook to unarchive tag
 */
export function useUnarchiveTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => tagService.unarchiveTag(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
            queryClient.invalidateQueries({ queryKey: tagKeys.tree() });
        },
    });
}

/**
 * Hook to move tag to new parent or position
 */
export function useMoveTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ tagId, newParentId, newIndex }: { 
            tagId: number; 
            newParentId?: number; 
            newIndex?: number;
        }) => tagService.moveTag(tagId, newParentId, newIndex),
        onSuccess: () => {
            // Invalidate all tag tree queries since hierarchy has changed
            queryClient.invalidateQueries({ queryKey: tagKeys.tree() });
            queryClient.invalidateQueries({ queryKey: tagKeys.all });
        },
    });
}
