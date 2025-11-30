/**
 * Dialog Action Helper Hook
 * Handles folder dialogs (edit, create)
 * 
 * @pattern Functions only - State should be accessed directly from useExplorerStore()
 * @returns {Object} Dialog action functions only (no state)
 */

import type { Folder } from '@/types/folder.types';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';

export const useDialogAction = () => {
    const {
        setSelectedFolder,
        setIsDialogOpen,
        setIsCreateDialogOpen,
        setParentFolderForCreate,
    } = useExplorerStore();

    /**
     * Edit Dialog actions
     */
    const openDialog = (folder: Folder) => {
        setSelectedFolder(folder);
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedFolder(null), 200); // After animation
    };

    const updateSelectedFolder = (folder: Folder) => {
        setSelectedFolder(folder);
    };

    /**
     * Create Dialog actions
     */
    const openCreateDialog = (parentFolder?: Folder) => {
        setParentFolderForCreate(parentFolder || null);
        setIsCreateDialogOpen(true);
    };

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setTimeout(() => setParentFolderForCreate(null), 200); // Clear after animation
    };

    return {
        // Edit dialog
        openDialog,
        closeDialog,
        updateSelectedFolder,
        
        // Create dialog
        openCreateDialog,
        closeCreateDialog,
    };
};
