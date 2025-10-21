/**
 * Workspace Service - API communication for workspace operations
 * Handles adding tags/notes to workspaces via WorkspaceController
 */

import { apiClient } from '@/lib/api-client';
import type { AddItemToWorkspaceRequest, WorkspaceItemResponse } from '../types/workspace.types';

class WorkspaceService {
    private readonly basePath = '/api/workspace';

    /**
     * Add an item (tag or note) to a workspace
     * POST /api/workspace/{workspaceId}/items
     * 
     * @param workspaceId - The workspace ID to add the item to
     * @param request - Details of the item to add (tag or note)
     * @returns The created workspace item with details
     */
    async addItemToWorkspace(
        workspaceId: number,
        request: AddItemToWorkspaceRequest
    ): Promise<WorkspaceItemResponse> {
        try {
            const response = await apiClient.post<WorkspaceItemResponse>(
                `${this.basePath}/${workspaceId}/items`,
                request
            );
            
            console.log('✅ Item added to workspace:', response);
            return response;
        } catch (error: any) {
            console.error('❌ Failed to add item to workspace:', error);
            throw error;
        }
    }

    /**
     * Add an existing tag to workspace
     */
    async addExistingTagToWorkspace(
        workspaceId: number,
        tagId: number,
        parentTagId?: number | null,
        options?: {
            color?: string;
            sortOrder?: number;
            label?: string;
        }
    ): Promise<WorkspaceItemResponse> {
        console.log('🏷️ addExistingTagToWorkspace called with:', {
            workspaceId,
            tagId,
            tagIdType: typeof tagId,
            parentTagId,
            options
        });

        const request: AddItemToWorkspaceRequest = {
            parentTagId: parentTagId || null,
            childType: 'tag',
            childId: tagId,
            color: options?.color,
            sortOrder: options?.sortOrder ?? 0,
            label: options?.label,
        };

        console.log('🏷️ Request payload:', JSON.stringify(request, null, 2));

        return this.addItemToWorkspace(workspaceId, request);
    }

    /**
     * Create new tag and add to workspace
     */
    async createAndAddTagToWorkspace(
        workspaceId: number,
        tagName: string,
        parentTagId?: number | null,
        options?: {
            color?: string;
            sortOrder?: number;
            label?: string;
            description?: string;
        }
    ): Promise<WorkspaceItemResponse> {
        const request: AddItemToWorkspaceRequest = {
            parentTagId: parentTagId || null,
            childType: 'tag',
            tagName, // Backend will auto-create tag with this name
            color: options?.color,
            sortOrder: options?.sortOrder ?? 0,
            label: options?.label,
            notes: options?.description,
        };

        return this.addItemToWorkspace(workspaceId, request);
    }

    /**
     * Add a note to workspace
     */
    async addNoteToWorkspace(
        workspaceId: number,
        noteId: number,
        parentTagId?: number | null,
        options?: {
            color?: string;
            sortOrder?: number;
            label?: string;
        }
    ): Promise<WorkspaceItemResponse> {
        const request: AddItemToWorkspaceRequest = {
            parentTagId: parentTagId || null,
            childType: 'note',
            childId: noteId,
            color: options?.color,
            sortOrder: options?.sortOrder ?? 0,
            label: options?.label,
        };

        return this.addItemToWorkspace(workspaceId, request);
    }
}

export const workspaceService = new WorkspaceService();
