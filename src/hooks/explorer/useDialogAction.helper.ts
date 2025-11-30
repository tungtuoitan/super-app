/**
 * Dialog Action Helper Hook (DEPRECATED - Use useFolderDialogHelper instead)
 * 
 * @deprecated This hook is kept for backward compatibility only.
 * New code should use openFolderDialog and closeFolderDialog from useFolderDialogHelper.
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
        resetForm,
    } = useFolderDialogStore();

    /**
     * Legacy edit dialog (for compatibility)
     */
    const openDialog = (folder: Folder) => {
        setSelectedFolder(folder);
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedFolder(null), 200);
    };

    const updateSelectedFolder = (folder: Folder) => {
        setSelectedFolder(folder);
    };

    /**
     * Create Dialog - Wrapper with inline logic
     */
    const openCreateDialog = (parentFolder?: Folder) => {
        setParentFolderForCreate(parentFolder || null);
        setIsCreateDialogOpen(true);
        setIsOpen(true);
        setMode('create');
    };

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setIsOpen(false);
        setTimeout(() => {
            setParentFolderForCreate(null);
            resetForm();
        }, 200);
    };
    
    /**
     * Edit Dialog - Wrapper with inline logic
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
        
        const editData = {
            ...folder,
            folderId: folder.folderId || folder.tagId,
        };
        
        setEditingFolder(editData);
        setNewFolderName(folder.name || '');
        setDescription(folder.description || '');
        setColor(folder.color || '#1976D2');
        setErrors({});
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
        // Legacy (for compatibility)
        openDialog,
        closeDialog,
        updateSelectedFolder,
        
        // Wrappers for backward compatibility
        openCreateDialog,
        closeCreateDialog,
        openEditDialog,
        closeEditDialog,
    };
};
