/**
 * Folder Service - API communication for folders (workspace navigation)
 * This is a wrapper/adapter for tagService.ts to provide folder-friendly terminology
 * Backend API still uses "tag" terminology
 */

import type {
    Folder,
    FolderDTO,
    FolderTreeResponseDTO,
    CreateFolderDTO,
    UpdateFolderDTO,
    GetFoldersParams,
    FolderTreeNode,
    WorkspaceWithFolderTree,
    WorkspaceWithTreeDTO,
    WorkspaceTreeItemDTO
} from '../types/folder.types';

// Re-use tagService implementation but export with folder terminology
import { tagService as backendService } from './tagService';

/**
 * Folder Service Class
 * Provides folder-centric API while communicating with backend's tag endpoints
 */
class FolderService {
    private readonly basePath = '/api/tags'; // Backend endpoint (still uses "tags")

    /**
     * Transform backend FolderDTO to frontend Folder
     * Maps tagId → folderId for frontend consistency
     */
    private transformFolder(dto: FolderDTO): Folder {
        return {
            folderId: dto.tagId, // Map backend tagId to frontend folderId
            tagId: dto.tagId, // Keep for backward compatibility
            name: dto.name,
            description: dto.description,
            color: dto.color,
            createdAt: new Date(dto.createdAt),
            isActive: dto.isActive,
            depth: dto.depth,
            isArchived: !dto.isActive,
            children: [],
        };
    }

    /**
     * Transform frontend CreateFolderDTO to backend format
     */
    private toBackendCreateDTO(dto: CreateFolderDTO): any {
        return {
            name: dto.name,
            description: dto.description,
            color: dto.color,
            parentId: dto.parentId,
            slug: dto.slug,
            icon: dto.icon,
            isPublic: dto.isPublic,
            publicSlug: dto.publicSlug,
            userId: dto.userId,
        };
    }

    /**
     * Get all folders with optional filtering
     */
    async getFolders(params?: GetFoldersParams): Promise<Folder[]> {
        const tags = await backendService.getTags(params as any);
        return tags.map(tag => ({
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId, // Required field
            children: tag.children?.map(child => ({
                ...child,
                folderId: child.tagId,
                tagId: child.tagId
            }))
        })) as Folder[];
    }

    /**
     * Get single folder by ID
     */
    async getFolderById(id: number): Promise<Folder> {
        const tag = await backendService.getTagById(id);
        return {
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        };
    }

    /**
     * Create new folder
     */
    async createFolder(data: CreateFolderDTO): Promise<Folder> {
        const tag = await backendService.createTag(data as any);
        return {
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        };
    }

    /**
     * Update existing folder
     */
    async updateFolder(id: number, data: UpdateFolderDTO): Promise<Folder> {
        const tag = await backendService.updateTag(id, data as any);
        return {
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        };
    }

    /**
     * Delete folder (removes folder from database)
     */
    async deleteFolder(id: number): Promise<void> {
        return backendService.deleteTag(id);
    }

    /**
     * Remove folder from workspace (soft delete from workspace_items table)
     * Does NOT delete the actual folder from the database
     */
    async removeFolderFromWorkspace(workspaceId: number, itemId: number): Promise<void> {
        return backendService.removeWorkspaceItem(workspaceId, itemId);
    }

    /**
     * Archive/unarchive folder
     */
    async archiveFolder(id: number): Promise<Folder> {
        const tag = await backendService.archiveTag(id);
        return {
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        };
    }

    async unarchiveFolder(id: number): Promise<Folder> {
        const tag = await backendService.unarchiveTag(id);
        return {
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        };
    }

    /**
     * Move folder to a new parent or position
     */
    async moveFolder(folderId: number, newParentId?: number, newIndex?: number): Promise<Folder> {
        const tag = await backendService.moveTag(folderId, newParentId, newIndex);
        return {
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        };
    }

    /**
     * Batch move multiple folders to a new parent/position
     */
    async batchMoveFolders(folderIds: number[], newParentId?: number, startIndex?: number): Promise<void> {
        return backendService.batchMoveTag(folderIds, newParentId, startIndex);
    }

    /**
     * Get folders at a specific depth level
     */
    async getFoldersByDepth(depth: number): Promise<Folder[]> {
        const tags = await backendService.getTagsByDepth(depth);
        return tags.map(tag => ({
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        }));
    }

    /**
     * Get root level folders only (depth 0)
     */
    async getRootFolders(): Promise<Folder[]> {
        const tags = await backendService.getRootTags();
        return tags.map(tag => ({
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        }));
    }

    /**
     * Get workspace folder tree with hierarchy
     */
    async getWorkspaceFolderTree(workspaceId: number): Promise<WorkspaceWithFolderTree> {
        const tree = await backendService.getWorkspaceTagTree(workspaceId);
        const folders = (tree.tags || []).map(tag => ({
            ...tag,
            folderId: tag.tagId,
            tagId: tag.tagId
        }));
        
        return {
            ...tree,
            folders,
            folderCount: tree.tagCount || 0,
            // Backward compatibility
            tags: folders,
            tagCount: tree.tagCount || 0
        };
    }
}

// Export singleton instance
export const folderService = new FolderService();

// Export class for testing
export { FolderService };
