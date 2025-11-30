/**
 * Folder React Query Hooks
 * Data fetching hooks for workspace folders
 * 
 * Note: Backend uses "tag" terminology, but frontend consistently uses "folder"
 * This file provides hooks for querying folder data from the API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hashtagService } from '../../services/hashtagService';
import type { 
    Folder, 
    CreateFolderDTO, 
    UpdateFolderDTO, 
    GetFoldersParams 
} from '../../types/folder.types';

// Query Keys for Folders
export const folderKeys = {
    all: ['folders'] as const,
    lists: () => [...folderKeys.all, 'list'] as const,
    list: (params?: GetFoldersParams) => [...folderKeys.lists(), params] as const,
    tree: () => [...folderKeys.all, 'tree'] as const,
    workspaceTree: (workspaceId: number) => 
        [...folderKeys.all, 'workspace', workspaceId, 'tree'] as const,
    details: () => [...folderKeys.all, 'detail'] as const,
    detail: (id: number) => [...folderKeys.details(), id] as const,
    depth: (depth: number) => [...folderKeys.all, 'depth', depth] as const,
    roots: () => [...folderKeys.all, 'roots'] as const,
};

/**
 * Hook to fetch all folders with optional filtering
 * @example
 * const { data: folders, isLoading } = useFolders({ isArchived: false });
 */
export function useFolders(params?: GetFoldersParams) {
    return useQuery({
        queryKey: folderKeys.list(params),
        queryFn: () => hashtagService.getTags(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to fetch workspace folder tree with hierarchy
 * @example
 * const { data: tree } = useWorkspaceFolderTree(workspaceId);
 */
export function useWorkspaceFolderTree(workspaceId: number) {
    return useQuery({
        queryKey: folderKeys.workspaceTree(workspaceId),
        queryFn: () => hashtagService.getWorkspaceTagTree(workspaceId),
        staleTime: 5 * 60 * 1000,
        enabled: workspaceId > 0, // Only fetch if ID is valid
    });
}

/**
 * Hook to fetch single folder by ID
 * @example
 * const { data: folder } = useFolder(folderId);
 */
export function useFolder(id: number, enabled = true) {
    return useQuery({
        queryKey: folderKeys.detail(id),
        queryFn: () => hashtagService.getTagById(id),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to fetch folders at a specific depth level
 * @example
 * const { data: rootFolders } = useFoldersByDepth(0);
 */
export function useFoldersByDepth(depth: number, enabled = true) {
    return useQuery({
        queryKey: folderKeys.depth(depth),
        queryFn: () => hashtagService.getTagsByDepth(depth),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to fetch root level folders only
 * @example
 * const { data: rootFolders } = useRootFolders();
 */
export function useRootFolders() {
    return useQuery({
        queryKey: folderKeys.roots(),
        queryFn: () => hashtagService.getRootTags(),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to create new folder
 * @example
 * const createFolder = useCreateFolder();
 * createFolder.mutate({ name: 'New Folder', parentTagId: 1 });
 */
export function useCreateFolder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: CreateFolderDTO) => hashtagService.createTag(data),
        onSuccess: (newFolder) => {
            // Invalidate all folder queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: folderKeys.all });
            
            // Also specifically invalidate tree queries since hierarchy may have changed
            queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
            
            // If the folder has a parent, invalidate queries for that depth level
            if (newFolder && (newFolder.depth || 0) > 0) {
                queryClient.invalidateQueries({ queryKey: folderKeys.depth(newFolder.depth || 0) });
                queryClient.invalidateQueries({ queryKey: folderKeys.roots() });
            }
        },
    });
}

/**
 * Hook to update existing folder
 * @example
 * const updateFolder = useUpdateFolder();
 * updateFolder.mutate({ id: 1, data: { name: 'Updated Name' } });
 */
export function useUpdateFolder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateFolderDTO }) =>
            hashtagService.updateTag(id, data),
        onSuccess: (_, { id }) => {
            // Invalidate specific folder and related queries
            queryClient.invalidateQueries({ queryKey: folderKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
            queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
        },
    });
}

/**
 * Hook to delete folder
 * @example
 * const deleteFolder = useDeleteFolder();
 * deleteFolder.mutate(folderId);
 */
export function useDeleteFolder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => hashtagService.deleteTag(id),
        onSuccess: () => {
            // Invalidate all folder queries
            queryClient.invalidateQueries({ queryKey: folderKeys.all });
        },
    });
}

/**
 * Hook to archive folder
 * @example
 * const archiveFolder = useArchiveFolder();
 * archiveFolder.mutate(folderId);
 */
export function useArchiveFolder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => hashtagService.archiveTag(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: folderKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
            queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
        },
    });
}

/**
 * Hook to unarchive folder
 * @example
 * const unarchiveFolder = useUnarchiveFolder();
 * unarchiveFolder.mutate(folderId);
 */
export function useUnarchiveFolder() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => hashtagService.unarchiveTag(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: folderKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
            queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
        },
    });
}

/**
 * Hook to move folder to new parent or position
 * @example
 * const moveFolder = useMoveFolder();
 * moveFolder.mutate({ folderId: 1, newParentId: 2, newIndex: 0 });
 */
export function useMoveFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ folderId, newParentId, newIndex }: {
            folderId: number;
            newParentId?: number;
            newIndex?: number;
        }) => hashtagService.moveTag(folderId, newParentId, newIndex),
        onSuccess: () => {
            // Invalidate all folder tree queries since hierarchy has changed
            queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
            queryClient.invalidateQueries({ queryKey: folderKeys.all });
        },
    });
}

/**
 * Hook to batch move multiple folders to new parent or position
 * Much more efficient than moving folders one by one
 * @example
 * const batchMove = useBatchMoveFolder();
 * batchMove.mutate({ folderIds: [1, 2, 3], newParentId: 5 });
 */
export function useBatchMoveFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ folderIds, newParentId, startIndex }: {
            folderIds: number[];
            newParentId?: number;
            startIndex?: number;
        }) => hashtagService.batchMoveTag(folderIds, newParentId, startIndex),
        onSuccess: () => {
            // Invalidate all folder tree queries since hierarchy has changed
            queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
            queryClient.invalidateQueries({ queryKey: folderKeys.all });
        },
    });
}

/**
 * Hook to remove item from workspace (removes workspace_items relationship only)
 * Does NOT delete the actual folder from folders/tags table
 * @example
 * const removeItem = useRemoveWorkspaceItem();
 * removeItem.mutate({ workspaceId: 1, itemId: 3 });
 */
export function useRemoveWorkspaceItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ workspaceId, itemId }: {
            workspaceId: number;
            itemId: number;
        }) => hashtagService.removeWorkspaceItem(workspaceId, itemId),
        onSuccess: () => {
            // Invalidate workspace tree queries
            queryClient.invalidateQueries({ queryKey: folderKeys.all });
        },
    });
}
