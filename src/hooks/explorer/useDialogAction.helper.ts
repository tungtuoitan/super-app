/**
 * Dialog Action Helper Hook
 * Handles folder dialogs (edit, create)
 * 
 * @pattern Functions only - State should be accessed directly from useExplorerStore()
 * @returns {Object} Dialog action functions only (no state)
 */

import type { Folder } from '@/types/folder.types';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useFolderDialogStore } from '@/store/explorer/FolderDialogStore';

export const useDialogAction = () => {
    const {
        setSelectedFolder,
        setIsDialogOpen,
        setIsCreateDialogOpen,
        setParentFolderForCreate,
    } = useExplorerStore();
    
    const {
        setIsOpen,
        setMode,
        setEditingFolder,
        setNewFolderName,
        setDescription,
        setColor,
        setErrors,
        setIsSubmitting,
        resetForm,
    } = useFolderDialogStore();

    /**
     * Edit Dialog actions (legacy - for compatibility)
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
        setIsCreateDialogOpen(true); // Legacy support
        setIsOpen(true); // New unified approach
    };

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false); // Legacy support
        setIsOpen(false); // New unified approach
        setTimeout(() => {
            setParentFolderForCreate(null);
            resetForm();
        }, 200); // Clear after animation
    };
    
    /**
     * Edit Dialog actions (new unified approach)
     */
    const openEditDialog = (folder: any) => {
        console.log('📝 Opening edit dialog for folder:', {
            folderId: folder.folderId || folder.tagId,
            name: folder.name,
            description: folder.description,
            color: folder.color,
            fullData: folder
        });
        
        setMode('edit');
        
        // Handle both folderId and tagId (for backward compatibility)
        const editData = {
            ...folder,
            folderId: folder.folderId || folder.tagId,
        };
        
        setEditingFolder(editData);
        
        // Pre-fill form with existing data (with safe fallbacks)
        setNewFolderName(folder.name || '');
        setDescription(folder.description || '');
        setColor(folder.color || '#1976D2');
        
        // Clear any previous errors
        setErrors({});
        
        // Open dialog
        setIsOpen(true);
        
        console.log('✅ Edit dialog opened with data:', {
            name: folder.name || '',
            description: folder.description || '',
            color: folder.color || '#1976D2'
        });
    };
    
    const closeEditDialog = () => {
        setIsOpen(false);
        setTimeout(() => {
            resetForm();
        }, 200);
    };

    return {
        // Legacy edit dialog (for compatibility)
        openDialog,
        closeDialog,
        updateSelectedFolder,
        
        // Create dialog
        openCreateDialog,
        closeCreateDialog,
        
        // New unified edit dialog
        openEditDialog,
        closeEditDialog,
    };
};
