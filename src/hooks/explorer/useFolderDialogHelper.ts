
import { useSnackbar } from 'notistack';
import { useFolderDialogStore } from '@/store/explorer/FolderDialogStore';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useAuthStore } from '@/store/auth/AuthStore';
import { _getWorkspaceTree, _upsertFolder } from '@/services/workspace.service';
import type { FolderDialogFormErrors } from '@/store/explorer/FolderDialogStore';
import type { Folder } from '@/types/folder.types';
import {useWorkspaceOperation} from './useWorkspaceOperation.helper';

export const useFolderDialogHelper = () => {
    const { enqueueSnackbar } = useSnackbar();
    const { loadTree } = useWorkspaceOperation();
    
    // Form state from FolderDialogStore
    const {
        mode,
        editingFolder,
        parentFolder,
        setParentFolder,
        newFolderName,
        description,
        color,
        setErrors,
        setIsSubmitting,
        setIsLoadingTree,
        setIsOpen,
        setMode,
        setEditingFolder,
        setNewFolderName,
        setDescription,
        setColor,
        resetForm,
    } = useFolderDialogStore();
    
    // Explorer state
    const {
        currentTree,
    } = useExplorerStore();
    
    // Auth
    const authStore = useAuthStore();
    const token = authStore.auth.userToken;
    
    // Computed value
    const selectedWorkspaceId = currentTree?.workspaceId;
    
    const validateNewFolder = (): boolean => {
        const newErrors: FolderDialogFormErrors = {};
        
        if (!newFolderName.trim()) {
            newErrors.name = 'Folder name is required';
        } else if (newFolderName.length > 200) {
            newErrors.name = 'Folder name must be less than 200 characters';
        }
        
        // Optional: Add description validation
        if (description && description.length > 1000) {
            newErrors.description = 'Description must be less than 1000 characters';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }
    
    
    /**
     * Submit folder (unified for create and edit)
     * Uses mode from FolderDialogStore to determine create vs edit
     */
    const submitFolder = async () => {
        // Validate form
        if (!validateNewFolder()) {
            return;
        }
        
        // Check workspace ID
        if (!selectedWorkspaceId) {
            enqueueSnackbar('No workspace selected', { variant: 'error' });
            return;
        }
        
        // Edit mode validation: check if we have editing folder
        if (mode === 'edit' && (!editingFolder || !editingFolder.folderId)) {
            enqueueSnackbar('No folder selected for editing', { variant: 'error' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Prepare folder data based on mode
            const folderData = mode === 'edit' 
                ? {
                    folderId: editingFolder!.folderId, // Include folderId for update
                    name: newFolderName.trim(),
                    description: description.trim() || undefined,
                    color,
                    parentId: editingFolder!.parentId || null,
                }
                : {
                    name: newFolderName.trim(),
                    description: description.trim() || undefined,
                    color,
                    parentId: parentFolder?.folderId || null,
                };
            
            // Call upsertFolder endpoint
            await _upsertFolder(token, selectedWorkspaceId, folderData);
            
            // Success message based on mode
            const successMessage = mode === 'edit' 
                ? `Folder "${newFolderName}" updated successfully!`
                : `Folder "${newFolderName}" created successfully!`;
            
            enqueueSnackbar(successMessage, { variant: 'success' });
            
            // Reload workspace tree
            loadTree(selectedWorkspaceId);
            
            // Close dialog
            closeFolderDialog();
            
            resetForm();
            
        } catch (error: any) {
            console.error(`Failed to ${mode} folder:`, error);
            enqueueSnackbar(
                error?.message || `Failed to ${mode} folder`, 
                { variant: 'error' }
            );
        } finally {
            setIsSubmitting(false);
        }
    }
    
    /**
     * Open folder dialog (unified for create and edit)
     * @param mode - 'create' or 'edit'
     * @param folderOrParent - For create: parent folder (optional), For edit: folder to edit (required)
     */
    const openFolderDialog = (dialogMode: 'create' | 'edit', folderOrParent?: Folder | null) => {
        console.log('📂 Opening folder dialog:', { mode: dialogMode, data: folderOrParent });
        
        setMode(dialogMode);
        
        if (dialogMode === 'create') {
            // Create mode: folderOrParent is the parent folder
            setParentFolder(folderOrParent || null);
            resetForm();
        } else {
            // Edit mode: folderOrParent is the folder to edit
            if (!folderOrParent) {
                console.error('❌ Edit mode requires a folder');
                return;
            }
            
            console.log('📝 Opening edit dialog for folder:', {
                folderId: folderOrParent.folderId || (folderOrParent as any).tagId,
                name: folderOrParent.name,
                description: folderOrParent.description,
                color: folderOrParent.color,
                fullData: folderOrParent
            });
            
            // Handle both folderId and tagId (for backward compatibility)
            const editData = {
                ...folderOrParent,
                folderId: folderOrParent.folderId || (folderOrParent as any).tagId,
            };
            
            setEditingFolder(editData);
            
            // Pre-fill form with existing data (with safe fallbacks)
            setNewFolderName(folderOrParent.name || '');
            setDescription(folderOrParent.description || '');
            setColor(folderOrParent.color || '#1976D2');
            
            console.log('✅ Edit dialog opened with data:', {
                name: folderOrParent.name || '',
                description: folderOrParent.description || '',
                color: folderOrParent.color || '#1976D2'
            });
        }
        
        // Clear any previous errors
        setErrors({});
        
        // Open dialog
        setIsOpen(true);
    };
    
    /**
     * Close folder dialog
     */
    const closeFolderDialog = () => {
        setIsOpen(false);
        setTimeout(() => {
            if (mode === 'create') {
                setParentFolder(null);
            }
            resetForm();
        }, 200); // Clear after animation
    };

    return {
        // Dialog actions
        openFolderDialog,
        closeFolderDialog,
        
        // Validation & Submit (unified)
        validateNewFolder,
        submitFolder,
    };
};
