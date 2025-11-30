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
    TagTreeNode,
    WorkspaceWithTagTreeDTO,
    WorkspaceWithTagTree,
    WorkspaceWithTreeDTO,
    WorkspaceTreeItemDTO
} from '../types/tag.types'
import {tagsDumpData} from '@/Components/tags/tagsDumpData';

// Toggle between dump data and real API
const USE_DUMP_DATA = false;


class TagService {
    private readonly basePath = '/api/tags'

    /**
     * Get all tags with optional filtering
     */
    async getTags(params?: GetTagsParams): Promise<Tag[]> {
        // Use dump data if enabled
        if (USE_DUMP_DATA) {
            console.log('📦 Using dump data for tags');
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 300));

            // Flatten tree to get all tags
            const flattenTags = (tags: Tag[]): Tag[] => {
                return tags.flatMap(tag => [tag, ...flattenTags(tag.children || [])]);
            };

            let allTags = flattenTags(tagsDumpData);

            console.log('📦 Flattened tags count:', allTags.length);
            console.log('📦 First 3 tags:', allTags.slice(0, 3).map(t => ({ 
                tagId: t.tagId, 
                id: t.id, 
                name: t.name 
            })));

            // Apply filtering
            if (params?.search) {
                const searchLower = params.search.toLowerCase();
                allTags = allTags.filter(tag =>
                    tag.name.toLowerCase().includes(searchLower) ||
                    tag.description?.toLowerCase().includes(searchLower)
                );
            }

            if (params?.isArchived !== undefined) {
                allTags = allTags.filter(tag => tag.isArchived === params.isArchived);
            }

            return allTags;
        }

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
     * REMOVED: Old /tree endpoint is deprecated
     * Use getWorkspaceTagTree(workspaceId) instead which calls workspace/{workspaceId}/tree
     */

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
     * Delete tag (removes tag from tags table)
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
     * Remove item from workspace (removes from workspace_items table only)
     * Does NOT delete the actual tag/note from the database
     */
    async removeWorkspaceItem(workspaceId: number, itemId: number): Promise<void> {
        try {
            console.log(`🗑️ [tagService] Removing workspace item ${itemId} from workspace ${workspaceId}`);
            await apiClient.delete(`/api/workspace/${workspaceId}/items/${itemId}`);
            console.log(`✅ [tagService] Successfully removed workspace item ${itemId}`);
        } catch (error) {
            console.error('Failed to remove workspace item:', error);
            throw error;
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
     * Move tag to a new parent or position
     * This updates the tag's parentId and potentially reorders siblings
     */
    async moveTag(tagId: number, newParentId?: number, newIndex?: number): Promise<Tag> {
        try {
            console.log('🔄 Moving tag:', { tagId, newParentId, newIndex });

            // Call the move endpoint (assuming backend has this)
            // If backend doesn't have a specific move endpoint, we'll just update parentId
            const response = await apiClient.put<TagDTO>(
                `${this.basePath}/${tagId}/move`,
                {
                    parentId: newParentId,
                    index: newIndex
                }
            );

            return this.transformTag(response);
        } catch (error) {
            console.error('Failed to move tag:', error);

            // Fallback: just update parentId if move endpoint doesn't exist
            console.log('Fallback: updating parentId only');
            return this.updateTag(tagId, { parentId: newParentId });
        }
    }

    /**
     * Batch move multiple tags to a new parent/position
     * Much more efficient than moving tags one by one
     */
    async batchMoveTag(tagIds: number[], newParentId?: number, startIndex: number = 0): Promise<void> {
        try {
            console.log('🔄 Batch moving tags:', { tagIds, newParentId, startIndex });

            await apiClient.post(
                `${this.basePath}/batch-move`,
                {
                    tagIds,
                    newParentId,
                    startIndex
                }
            );

            console.log('✅ Batch move successful');
        } catch (error) {
            console.error('Failed to batch move tags:', error);
            throw error;
        }
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
     * Build hierarchical tree from flat tags using parentId and childId relationship
     * Relationship: item.parentId === parent.childId
     */
    private buildTreeFromParentChild(flatTags: Tag[], originalItems: any[]): Tag[] {
        if (!flatTags || flatTags.length === 0) return [];

        console.log('🌲 [buildTreeFromParentChild] Building tree from:', {
            flatTagsCount: flatTags.length,
            originalItemsCount: originalItems.length
        });

        // Create a map of childId -> tag for quick lookup
        const tagByChildId = new Map<number, Tag>();
        const tagByItemId = new Map<number, Tag>();
        
        flatTags.forEach(tag => {
            tagByChildId.set(tag.tagId, tag);
            if (tag.itemId) {
                tagByItemId.set(tag.itemId, tag);
            }
            // Initialize children array
            tag.children = [];
        });

        // Create a map of original items for parent lookup
        const itemByChildId = new Map<number, any>();
        originalItems.forEach(item => {
            itemByChildId.set(item.childId, item);
        });

        const rootTags: Tag[] = [];

        // Build parent-child relationships
        flatTags.forEach(tag => {
            const originalItem = itemByChildId.get(tag.tagId);
            
            if (!originalItem) {
                console.warn(`⚠️ No original item found for tag ${tag.tagId}`);
                rootTags.push(tag);
                return;
            }

            console.log(`🔍 Processing tag "${tag.name}":`, {
                tagId: tag.tagId,
                childId: originalItem.childId,
                parentId: originalItem.parentId
            });

            // If parentId is null, this is a root tag
            if (originalItem.parentId === null || originalItem.parentId === undefined) {
                console.log(`✅ "${tag.name}" is ROOT (parentId: null)`);
                rootTags.push(tag);
            } else {
                // Find parent tag by matching: parent.childId === item.parentId
                const parentTag = tagByChildId.get(originalItem.parentId);
                
                if (parentTag) {
                    console.log(`✅ "${tag.name}" is CHILD of "${parentTag.name}" (parentId: ${originalItem.parentId})`);
                    parentTag.children = parentTag.children || [];
                    parentTag.children.push(tag);
                } else {
                    console.warn(`⚠️ Parent not found for tag "${tag.name}" (parentId: ${originalItem.parentId}), treating as root`);
                    rootTags.push(tag);
                }
            }
        });

        console.log('🌲 [buildTreeFromParentChild] Tree built:', {
            rootCount: rootTags.length,
            roots: rootTags.map(t => ({ name: t.name, childrenCount: t.children?.length || 0 }))
        });

        return rootTags;
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

    /**
     * Get workspace tag tree with hierarchy
     * Returns workspace as root node with tags as children
     * NEW: Uses WorkspaceWithTreeDTO (polymorphic items: tags, notes, files)
     */
    async getWorkspaceTagTree(workspaceId: number): Promise<WorkspaceWithTagTree> {
        try {
            console.log(`📦 [tagService] Fetching workspace tree for workspaceId: ${workspaceId}`);
            console.log(`📦 [tagService] API URL: ${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/workspace/${workspaceId}/tree`);
            
            const response = await apiClient.get<WorkspaceWithTreeDTO>(
                `/api/workspace/${workspaceId}/tree`
            );
            
            console.log('✅ [tagService] Workspace tree response:', response);
            console.log('✅ [tagService] Response items count:', response.items?.length || 0);
            
            // Filter only tags from polymorphic items (case-insensitive)
            const tagItems = response.items.filter(item =>
                item.itemType?.toLowerCase() === 'tag'
            );

            console.log('✅ [tagService] Filtered tag items:', tagItems.length);
            console.log('✅ [tagService] First tag item:', tagItems[0]);

            // Transform workspace tree items to tags (flat array first)
            const flatTags = tagItems.map((item: WorkspaceTreeItemDTO) =>
                this.transformWorkspaceTreeItemToTag(item)
            );

            console.log('✅ [tagService] Flat tags:', flatTags.length);
            console.log('✅ [tagService] First flat tag:', flatTags[0]);

            // Build hierarchical tree structure based on parentId and childId
            const tags = this.buildTreeFromParentChild(flatTags, tagItems);

            console.log('✅ [tagService] Hierarchical tags:', tags.length);
            console.log('✅ [tagService] First hierarchical tag:', tags[0]);
            
            // Transform the response
            return {
                workspaceId: response.workspaceId,
                userId: response.userId,
                name: response.name,
                description: response.description,
                color: response.color,
                icon: response.icon,
                type: response.type,
                maxDepth: response.maxDepth,
                isDefault: response.isDefault,
                isPublic: response.isPublic,
                isTemplate: response.isTemplate,
                isArchived: response.isArchived,
                tagCount: response.tagCount,
                memberCount: response.memberCount,
                settings: response.settings,
                createdAt: new Date(response.createdAt),
                updatedAt: response.updatedAt ? new Date(response.updatedAt) : undefined,
                tags: tags
            };
        } catch (error) {
            console.error('Failed to fetch workspace tree:', error);
            throw error;
        }
    }

    /**
     * Transform WorkspaceTreeItemDTO to Tag (flat, without children)
     * Children will be built separately using buildTreeFromParentChild
     */
    private transformWorkspaceTreeItemToTag(item: any): Tag {
        // WorkspaceTreeItemDTO structure from backend:
        // - id / itemId: workspace_items.item_id (PK for deletion)
        // - childId: actual tag_id/note_id (FK to tags/notes table)
        const workspaceItemId = item.id || item.itemId; // workspace_items.item_id
        const actualTagId = item.childId; // tags.tag_id

        console.log('🔍 [transformWorkspaceTreeItemToTag]', {
            name: item.name,
            workspaceItemId,
            tagId: actualTagId,
            parentId: item.parentId
        });

        return {
            tagId: actualTagId,
            id: actualTagId,
            itemId: workspaceItemId, // Store workspace_items.item_id for deletion
            name: item.name,
            description: item.notes,
            color: item.color,
            createdAt: new Date(item.createdAt || new Date()),
            isActive: true,
            depth: item.depth || 0,
            children: [], // Will be populated by buildTreeFromParentChild
            isExpanded: false,
            isArchived: false
        };
    }
}

export const tagService = new TagService();