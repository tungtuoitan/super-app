/**
 * Tree Selection Helper Hook
 * Handles folder selection operations (VS Code-like multi-selection)
 */

import type { NodeApi } from 'react-arborist';
import type { TreeFolder } from './tree.helper';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';

export const useTreeSelection = () => {
    const {
        selectedFolderIds,
        setSelectedFolderIds,
        lastSelectedFolderId,
        setLastSelectedFolderId,
    } = useExplorerStore();

    /**
     * Toggle selection for a single folder
     */
    const toggleFolderSelection = (folderId: number) => {
        setSelectedFolderIds(prev => {
            if (prev.includes(folderId)) {
                return prev.filter(id => id !== folderId);
            } else {
                return [...prev, folderId];
            }
        });
    };

    /**
     * Select all folders
     */
    const selectAllFolders = (folderIds: number[]) => {
        setSelectedFolderIds(folderIds);
    };

    /**
     * Clear all selections
     */
    const clearSelection = () => {
        setSelectedFolderIds([]);
        setLastSelectedFolderId(null);
    };

    /**
     * Check if a folder is selected
     */
    const isFolderSelected = (folderId: number) => {
        return selectedFolderIds.includes(folderId);
    };

    /**
     * Handle selection change from react-arborist tree
     */
    const handleSelectionChange = (nodes: NodeApi<TreeFolder>[]) => {
        const selectedIds = nodes.map(node => node.id);
        console.log('🎯 Tree selection changed:', selectedIds);
        const folderIds = selectedIds.map(id => parseInt(id)).filter(id => id > 0); // Filter out workspace nodes
        setSelectedFolderIds(folderIds);
        if (folderIds.length > 0) {
            setLastSelectedFolderId(folderIds[folderIds.length - 1]);
        }
    };

    return {
        selectedFolderIds,
        lastSelectedFolderId,
        toggleFolderSelection,
        selectAllFolders,
        clearSelection,
        isFolderSelected,
        handleSelectionChange,
    };
};
