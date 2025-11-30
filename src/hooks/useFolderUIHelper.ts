/**
 * Folder UI Helper Hook
 * Business logic for folder UI operations
 * Pattern: Separate business logic from store (similar to useEditorTabHelper)
 */

import { useCallback } from 'react';
import { useFolderUIStore } from '@/store/folderUI/FolderUIStore';
import type { Folder } from '@/types/folder.types';

export const useFolderUIHelper = () => {
    const {
        setSelectedFolder,
        setIsDialogOpen,
        setIsCreateDialogOpen,
        setParentFolderForCreate,
        setExpandedNodes,
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
    } = useFolderUIStore();

    /**
     * Dialog actions
     */
    const openDialog = (folder: Folder) => {
        setSelectedFolder(folder);
        setIsDialogOpen(true);
    }

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedFolder(null), 200); // After animation
    }

    const updateSelectedFolder = (folder: Folder) => {
        setSelectedFolder(folder);
    }
    /**
     * Create dialog actions
     */
    const openCreateDialog = (parentFolder?: Folder) => {
        setParentFolderForCreate(parentFolder || null);
        setIsCreateDialogOpen(true);
    }

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setTimeout(() => setParentFolderForCreate(null), 200); // Clear after animation
    }

    /**
     * Tree expansion actions
     */
    const toggleNodeExpansion = (folderId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    }

    const expandNode = (folderId: number) => {
        setExpandedNodes(prev => new Set(prev).add(folderId));
    }
    const collapseNode = (folderId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(folderId);
            return newSet;
        });
    }

    const expandAll = () => {
        // This would need to be called with all folder IDs
        // For now, we'll just expand first few levels
        setExpandedNodes(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    }

    const collapseAll = () => {
        setExpandedNodes(new Set());
    }
    /**
     * Selection actions (VS Code-like)
     */
    const toggleFolderSelection = (folderId: number) => {
        setSelectedFolderIds(prev => {
            if (prev.includes(folderId)) {
                return prev.filter(id => id !== folderId);
            } else {
                return [...prev, folderId];
            }
        });
    }

    const selectAllFolders = (folderIds: number[]) => {
        setSelectedFolderIds(folderIds);
    }
    const clearSelection = () => {
        setSelectedFolderIds([]);
        setLastSelectedFolderId(null);
    }
    const isFolderSelected = (folderId: number) => {
        return selectedFolderIds.includes(folderId);
    }

    return {
        // Dialog actions
        openDialog,
        closeDialog,
        updateSelectedFolder,
        
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
        toggleFolderSelection,
        selectAllFolders,
        clearSelection,
        isFolderSelected,
    };
};
