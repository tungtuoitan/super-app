/**
 * Workspace React Query Hooks
 * Hooks for workspace tag tree operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import type { AddItemToWorkspaceRequest } from '../types/workspace.types';
import { tagKeys } from './useTags';

/**
 * Hook to add item (tag or note) to workspace
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
            // Invalidate workspace tag tree to refetch
            queryClient.invalidateQueries({ 
                queryKey: tagKeys.workspaceTree(variables.workspaceId) 
            });
            
            // Also invalidate general tag list
            queryClient.invalidateQueries({ 
                queryKey: tagKeys.all 
            });
        },
    });
}

/**
 * Hook to add existing tag to workspace
 */
export function useAddExistingTagToWorkspace() {
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
                queryKey: tagKeys.workspaceTree(variables.workspaceId) 
            });
        },
    });
}

/**
 * Hook to create new tag and add to workspace
 */
export function useCreateAndAddTagToWorkspace() {
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
                queryKey: tagKeys.workspaceTree(variables.workspaceId) 
            });
            
            // Invalidate tag lists only (not all tag queries)
            // This updates the tag dropdown without causing double fetch of workspace tree
            queryClient.invalidateQueries({ 
                queryKey: tagKeys.lists() 
            });
        },
    });
}
