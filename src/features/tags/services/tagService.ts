/**
 * Tag Service - API communication and business logic for tags
 */

import { apiClient } from '@/lib/api-client'
import type { 
    Tag, 
    TagDTO,
    TagTreeResponseDTO,
    CreateTagDTO, 
    UpdateTagDTO, 
    GetTagsParams,
    TagTreeNode 
} from '../types/tag.types'


class TagService {
    private readonly basePath = '/api/tags'

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

            const response = await apiClient.get<TagDTO[]>(this.basePath, {
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
     * Backend only returns: tagId, name, description, color, createdAt, isActive, depth
     */
    private transformTag(dto: TagDTO): Tag {
        return {
            tagId: dto.tagId,
            name: dto.name,
            description: dto.description,
            color: dto.color,
            createdAt: new Date(dto.createdAt),
            isActive: dto.isActive,
            depth: dto.depth,
            // Computed/frontend-only properties
            id: dto.tagId, // Alias for backward compatibility
            isArchived: !dto.isActive, // isArchived is inverse of isActive
            children: [], // Will be populated by tree building logic
            isExpanded: false,
        }
    }

    /**
     * Get tags organized as tree structure from the /tree endpoint
     */
    async getTagTree(includeShared: boolean = true): Promise<Tag[]> {
        try {
            const response = await apiClient.get<TagTreeResponseDTO[]>(`${this.basePath}/tree`, {
                params: { includeShared }
            });
            return response.map(dto => this.transformTagTreeResponse(dto));
        } catch (error) {
            console.error('Failed to fetch tag tree:', error);
            throw error;
        }
    }

    /**
     * Transform TagTreeResponseDTO to Tag with children structure
     */
    private transformTagTreeResponse(dto: TagTreeResponseDTO): Tag {
        return {
            tagId: dto.tagId,
            name: dto.name,
            description: undefined, // Not available in tree response
            color: dto.color,
            createdAt: new Date(), // Not available in tree response
            isActive: true, // Assuming active tags only in tree
            depth: dto.level,
            // Computed properties
            id: dto.tagId, // Alias for backward compatibility
            isArchived: false, // Assuming no archived tags in tree
            children: dto.children?.map(child => this.transformTagTreeResponse(child)) || [],
            isExpanded: dto.isExpanded,
        };
    }

    /**
     * Get single tag by ID
     */
    async getTagById(id: number): Promise<Tag> {
        try {
            const response = await apiClient.get<TagDTO>(`${this.basePath}/${id}`)
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
            // Ensure userId is provided - using hardcoded value for development
            // TODO: Replace with actual user ID from auth context when auth is implemented
            const createPayload = {
                ...data,
                userId: data.userId || 14 // Default to 14 for development
            }
            
            const response = await apiClient.post<TagDTO>(this.basePath, createPayload)
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
            const response = await apiClient.put<TagDTO>(`${this.basePath}/${id}`, data)
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
     * Build hierarchical tree structure from flat array using depth property
     */
    private buildTagTree(tags: Tag[]): Tag[] {
        if (!tags || tags.length === 0) return [];

        // Sort tags by depth to ensure parents come before children
        const sortedTags = [...tags].sort((a, b) => (a.depth || 0) - (b.depth || 0));
        
        const result: Tag[] = [];
        const tagStack: Tag[] = [];

        sortedTags.forEach(tag => {
            const tagWithChildren: Tag = { 
                ...tag, 
                children: [],
                isExpanded: false 
            };

            const currentDepth = tag.depth || 0;

            // Remove items from stack that are not ancestors of current tag
            while (tagStack.length > 0 && (tagStack[tagStack.length - 1].depth || 0) >= currentDepth) {
                tagStack.pop();
            }

            // If this is a root level tag (depth 0 or undefined)
            if (currentDepth === 0) {
                result.push(tagWithChildren);
                tagStack.length = 0; // Clear stack for new root
                tagStack.push(tagWithChildren);
            } else if (tagStack.length > 0) {
                // Add as child to the last item in stack (which should be the parent)
                const parent = tagStack[tagStack.length - 1];
                parent.children = parent.children || [];
                parent.children.push(tagWithChildren);
                tagStack.push(tagWithChildren);
            } else {
                // Fallback: treat as root if no valid parent found
                result.push(tagWithChildren);
                tagStack.push(tagWithChildren);
            }
        });

        return result;
    }

    /**
     * Get tags at a specific depth level
     */
    async getTagsByDepth(depth: number): Promise<Tag[]> {
        const allTags = await this.getTags();
        return allTags.filter(tag => (tag.depth || 0) === depth);
    }

    /**
     * Get root level tags only (depth 0)
     */
    async getRootTags(): Promise<Tag[]> {
        return this.getTagsByDepth(0);
    }
}

export const tagService = new TagService();