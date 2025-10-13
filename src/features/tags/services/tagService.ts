/**
 * Tag Service - API communication and business logic for tags
 */

import { apiClient } from '@/lib/api-client'
import type { 
    Tag, 
    CreateTagDTO, 
    UpdateTagDTO, 
    GetTagsParams,
    TagTreeNode 
} from '../types/tag.types'


class TagService {
    private readonly basePath = '/api/Tags'

    /**
     * Get all tags with optional filtering
     */
    async getTags(params?: GetTagsParams): Promise<Tag[]> {
        try {
            const searchParams: Record<string, string | number | boolean> = {}

            if (params?.search) {
                searchParams.search = params.search
            }
            if (params?.parentId !== undefined) {
                searchParams.parentId = params.parentId
            }
            if (params?.isArchived !== undefined) {
                searchParams.isArchived = params.isArchived
            }
            if (params?.sortBy) {
                searchParams.sortBy = params.sortBy
            }
            if (params?.sortOrder) {
                searchParams.sortOrder = params.sortOrder
            }

            const response = await apiClient.get<Tag[]>(this.basePath, {
                params: searchParams
            })

            // Transform the response to ensure proper types
            return response.map(this.transformTag)
        } catch (error) {
            console.error('Failed to fetch tags:', error)
            throw error
        }
    }

    /**
     * Transform API DTO to domain model
     */
    private transformTag(dto: any): Tag {
        return {
            id: dto.id || dto.tagId,
            tagId: dto.id || dto.tagId, // Alias for backward compatibility
            userId: dto.userId || 1, // Default if not provided
            name: dto.name,
            parentId: dto.parentId,
            path: dto.path,
            slug: dto.slug,
            color: dto.color,
            icon: dto.icon,
            description: dto.description,
            isPublic: dto.isPublic,
            publicSlug: dto.publicSlug,
            createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
            updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
            deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : undefined,
            createdBy: dto.createdBy,
            isArchived: dto.isArchived ?? false,
            level: dto.level,
            children: dto.children,
            isExpanded: dto.isExpanded,
        }
    }

    /**
     * Get tags organized as tree structure
     */
    async getTagTree(): Promise<Tag[]> {
        const allTags = await this.getTags();
        return this.buildTagTree(allTags);
    }

    /**
     * Get single tag by ID
     */
    async getTagById(id: number): Promise<Tag> {
        try {
            const response = await apiClient.get<Tag>(`${this.basePath}/${id}`)
            return this.transformTag(response)
        } catch (error) {
            console.error(`Failed to fetch tag ${id}:`, error)
            throw error
        }
    }

    /**
     * Create new tag
     */
    async createTag(data: CreateTagDTO): Promise<Tag> {
        try {
            const response = await apiClient.post<Tag>(this.basePath, data)
            return this.transformTag(response)
        } catch (error) {
            console.error('Failed to create tag:', error)
            throw error
        }
    }

    /**
     * Update existing tag
     */
    async updateTag(id: number, data: UpdateTagDTO): Promise<Tag> {
        try {
            const response = await apiClient.put<Tag>(`${this.basePath}/${id}`, data)
            return this.transformTag(response)
        } catch (error) {
            console.error('Failed to update tag:', error)
            throw error
        }
    }

    /**
     * Delete tag
     */
    async deleteTag(id: number): Promise<void> {
        try {
            await apiClient.delete(`${this.basePath}/${id}`)
        } catch (error) {
            console.error('Failed to delete tag:', error)
            throw error
        }
    }

    /**
     * Archive/unarchive tag
     */
    async archiveTag(id: number): Promise<Tag> {
        return this.updateTag(id, { isArchived: true });
    }

    async unarchiveTag(id: number): Promise<Tag> {
        return this.updateTag(id, { isArchived: false });
    }

    /**
     * Build hierarchical tree structure from flat array
     */
    private buildTagTree(tags: Tag[]): Tag[] {
        const tagMap = new Map<number, Tag>();
        const rootTags: Tag[] = [];

        // Create map for quick lookup
        tags.forEach(tag => {
            tagMap.set(tag.tagId, { ...tag, children: [] });
        });

        // Build tree structure
        tags.forEach(tag => {
            const tagWithChildren = tagMap.get(tag.tagId)!;
            
            if (tag.parentId) {
                const parent = tagMap.get(tag.parentId);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(tagWithChildren);
                }
            } else {
                rootTags.push(tagWithChildren);
            }
        });

        return rootTags;
    }

    /**
     * Get children of specific tag
     */
    async getTagChildren(parentId: number): Promise<Tag[]> {
        return this.getTags({ parentId });
    }

    /**
     * Get root level tags only
     */
    async getRootTags(): Promise<Tag[]> {
        return this.getTags({ parentId: undefined }).then(tags =>
            tags.filter(tag => !tag.parentId)
        );
    }
}

export const tagService = new TagService();