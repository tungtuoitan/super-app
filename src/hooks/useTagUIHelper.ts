/**
 * Tag UI Helper Hook
 * Business logic for tag UI operations
 * Pattern: Separate business logic from store (similar to useEditorTabHelper)
 */

import { useCallback } from 'react';
import { useTagUIStore } from '@/store/tagUI/TagUIStore';
import type { Tag } from '@/types/folder.types';

export const useTagUIHelper = () => {
    const {
        setSelectedTag,
        setIsDialogOpen,
        setIsCreateDialogOpen,
        setParentTagForCreate,
        setExpandedNodes,
        selectedTagIds,
        setSelectedTagIds,
        setLastSelectedTagId,
    } = useTagUIStore();

    /**
     * Dialog actions
     */
    const openDialog = (tag: Tag) => {
        setSelectedTag(tag);
        setIsDialogOpen(true);
    }

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedTag(null), 200); // After animation
    }

    const updateSelectedTag = (tag: Tag) => {
        setSelectedTag(tag);
    }
    /**
     * Create dialog actions
     */
    const openCreateDialog = (parentTag?: Tag) => {
        setParentTagForCreate(parentTag || null);
        setIsCreateDialogOpen(true);
    }

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setTimeout(() => setParentTagForCreate(null), 200); // Clear after animation
    }

    /**
     * Tree expansion actions
     */
    const toggleNodeExpansion = (tagId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) {
                newSet.delete(tagId);
            } else {
                newSet.add(tagId);
            }
            return newSet;
        });
    }

    const expandNode = (tagId: number) => {
        setExpandedNodes(prev => new Set(prev).add(tagId));
    }
    const collapseNode = (tagId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(tagId);
            return newSet;
        });
    }

    const expandAll = () => {
        // This would need to be called with all tag IDs
        // For now, we'll just expand first few levels
        setExpandedNodes(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    }

    const collapseAll = () => {
        setExpandedNodes(new Set());
    }
    /**
     * Selection actions (VS Code-like)
     */
    const toggleTagSelection = (tagId: number) => {
        setSelectedTagIds(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
    }

    const selectAllTags = (tagIds: number[]) => {
        setSelectedTagIds(tagIds);
    }
    const clearSelection = () => {
        setSelectedTagIds([]);
        setLastSelectedTagId(null);
    }
    const isTagSelected = (tagId: number) => {
        return selectedTagIds.includes(tagId);
    }

    return {
        // Dialog actions
        openDialog,
        closeDialog,
        updateSelectedTag,
        
        // Create dialog actions
        openCreateDialog,
        closeCreateDialog,
        
        // Tree expansion actions
        toggleNodeExpansion,
        expandNode,
        collapseNode,
        expandAll,
        collapseAll,
        
        // Selection actions
        toggleTagSelection,
        selectAllTags,
        clearSelection,
        isTagSelected,
    };
};
