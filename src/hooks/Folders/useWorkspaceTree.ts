/**
 * Workspace Tree React Query Hooks
 * Hooks for workspace folder tree operations (adding/updating folders in workspace)
 * 
 * Note: Backend uses "tag" terminology, frontend uses "folder"
 * These hooks handle mutations for the workspace folder tree structure
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../../services/workspaceService';
import type { 
    AddItemToWorkspaceRequest,
    UpdateWorkspaceItemRequest
} from '../../types/workspace.types';
import { folderKeys } from './useFolders';

/**
 * Hook to add item (folder or note) to workspace tree
 * @example
 * const addItem = useAddItemToWorkspace();
 * addItem.mutate({ workspaceId: 1, request: { childType: 'folder', ... } });
 */
export function useAddItemToWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            workspaceId,
            request,
        }: {
            workspaceId: number;
            request: AddItemToWorkspaceRequest;
        }) => workspaceService.addItemToWorkspace(workspaceId, request),
        
        onSuccess: (_, variables) => {
            // Invalidate workspace folder tree to refetch
            queryClient.invalidateQueries({ 
                queryKey: folderKeys.workspaceTree(variables.workspaceId) 
            });
            
            // Also invalidate general folder list
            queryClient.invalidateQueries({ 
                queryKey: folderKeys.all 
            });
        },
    });
}

/**
 * Hook to add existing folder to workspace tree
 * @example
 * const addExisting = useAddExistingFolderToWorkspace();
 * addExisting.mutate({ workspaceId: 1, tagId: 5, parentTagId: 2 });
 */
export function useAddExistingFolderToWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            workspaceId,
            tagId,
            parentTagId,
            options,
        }: {
            workspaceId: number;
            tagId: number;
            parentTagId?: number | null;
            options?: {
                color?: string;
                sortOrder?: number;
                label?: string;
            };
        }) => workspaceService.addExistingTagToWorkspace(
            workspaceId,
            tagId,
            parentTagId,
            options
        ),
        
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ 
                queryKey: folderKeys.workspaceTree(variables.workspaceId) 
            });
        },
    });
}

/**
 * Hook to create new folder and add to workspace tree
 * @example
 * const createFolder = useCreateAndAddFolderToWorkspace();
 * createFolder.mutate({ workspaceId: 1, tagName: 'New Folder', parentTagId: 2 });
 */
export function useCreateAndAddFolderToWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            workspaceId,
            tagName,
            parentTagId,
            options,
        }: {
            workspaceId: number;
            tagName: string;
            parentTagId?: number | null;
            options?: {
                color?: string;
                sortOrder?: number;
                label?: string;
                description?: string;
            };
        }) => workspaceService.createAndAddTagToWorkspace(
            workspaceId,
            tagName,
            parentTagId,
            options
        ),
        
        onSuccess: (_, variables) => {
            // Invalidate workspace tree - primary update
            queryClient.invalidateQueries({ 
                queryKey: folderKeys.workspaceTree(variables.workspaceId) 
            });
            
            // Invalidate folder lists only (not all folder queries)
            // This updates the folder dropdown without causing double fetch of workspace tree
            queryClient.invalidateQueries({ 
                queryKey: folderKeys.lists() 
            });
        },
    });
}

/**
 * Hook to update workspace item metadata (folder properties in workspace context)
 * @example
 * const updateItem = useUpdateWorkspaceItem();
 * updateItem.mutate({ workspaceId: 1, itemId: 3, request: { label: 'New Label' } });
 */
export function useUpdateWorkspaceItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            workspaceId,
            itemId,
            request,
        }: {
            workspaceId: number;
            itemId: number;
            request: UpdateWorkspaceItemRequest;
        }) => workspaceService.updateWorkspaceItem(workspaceId, itemId, request),
        
        onSuccess: (_, variables) => {
            // Invalidate workspace tree to refetch
            queryClient.invalidateQueries({ 
                queryKey: folderKeys.workspaceTree(variables.workspaceId) 
            });
        },
    });
}

// Legacy exports for backward compatibility (deprecated)
/** @deprecated Use useAddExistingFolderToWorkspace instead */
export const useAddExistingTagToWorkspace = useAddExistingFolderToWorkspace;

/** @deprecated Use useCreateAndAddFolderToWorkspace instead */
export const useCreateAndAddTagToWorkspace = useCreateAndAddFolderToWorkspace;
