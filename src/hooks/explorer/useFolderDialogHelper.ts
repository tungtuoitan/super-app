
import { useSnackbar } from 'notistack';
import { useFolderDialogStore } from '@/store/explorer/FolderDialogStore';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useAuthStore } from '@/store/auth/AuthStore';
import { _getWorkspaceTree, _upsertFolder } from '@/services/workspace.service';
import type { FolderDialogFormErrors } from '@/store/explorer/FolderDialogStore';
import { useDialogAction } from './useDialogAction.helper';
import {useWorkspaceOperation} from './useWorkspaceOperation.helper';

export const useFolderDialogHelper = () => {
    const { enqueueSnackbar } = useSnackbar();
    const { closeCreateDialog, closeEditDialog } = useDialogAction();
    const { loadTree } = useWorkspaceOperation();
    
    
    // Form state from FolderDialogStore
    const {
        mode,
        editingFolder,
        newFolderName,
        description,
        color,
        setErrors,
        setIsSubmitting,
        setIsLoadingTree,
        setWorkspaceTree,
    } = useFolderDialogStore();
    const {
        resetForm,
    } = useFolderDialogStore();
    
    // Explorer state
    const {
        currentTree,
        parentFolderForCreate,
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
     * Fetch workspace tree
     * @param {number} workspaceId - Workspace ID to fetch tree for
     */
    const fetchWorkspaceTree = async (workspaceId: number) => {
        setIsLoadingTree(true);
        try {
            const response = await _getWorkspaceTree(token, workspaceId);
            setWorkspaceTree(response.items || []);
        } catch (error) {
            console.error('Failed to fetch workspace tree:', error);
            enqueueSnackbar('Failed to load workspace tree', { variant: 'error' });
        } finally {
            setIsLoadingTree(false);
        }
    }
    
    /**
     * Submit new folder creation
     * @param {Function} onSuccess - Callback to execute on successful creation
     */
    const submitNewFolder = async () => {
        // Validate form
        if (!validateNewFolder()) {
            return;
        }
        
        // Check workspace ID
        if (!selectedWorkspaceId) {
            enqueueSnackbar('No workspace selected', { variant: 'error' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Create new folder using upsertFolder endpoint
            await _upsertFolder(token, selectedWorkspaceId, {
                name: newFolderName.trim(),
                description: description.trim() || undefined,
                color,
                parentId: parentFolderForCreate?.folderId || null,
            });
            
            enqueueSnackbar(`Folder "${newFolderName}" created successfully!`, { 
                variant: 'success' 
            });
            
            loadTree(selectedWorkspaceId);
            
            // Execute success callback (typically closes dialog)
            closeCreateDialog();
            
            resetForm()
            
        } catch (error: any) {
            console.error('Failed to create folder:', error);
            enqueueSnackbar(
                error?.message || 'Failed to create folder', 
                { variant: 'error' }
            );
        } finally {
            setIsSubmitting(false);
        }
    }
    
    
    /**
     * Submit edit folder
     */
    const submitEditFolder = async () => {
        // Validate form
        if (!validateNewFolder()) {
            return;
        }
        
        // Check if we have editing folder
        if (!editingFolder || !editingFolder.folderId) {
            enqueueSnackbar('No folder selected for editing', { variant: 'error' });
            return;
        }
        
        // Check workspace ID
        if (!selectedWorkspaceId) {
            enqueueSnackbar('No workspace selected', { variant: 'error' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Update folder using upsertFolder endpoint
            await _upsertFolder(token, selectedWorkspaceId, {
                folderId: editingFolder.folderId, // Include folderId for update
                name: newFolderName.trim(),
                description: description.trim() || undefined,
                color,
                parentId: editingFolder.parentId || null,
            });
            
            enqueueSnackbar(`Folder "${newFolderName}" updated successfully!`, { 
                variant: 'success' 
            });
            
            // Reload workspace tree
            loadTree(selectedWorkspaceId);
            
            // Close dialog
            closeEditDialog();
            
            resetForm();
            
        } catch (error: any) {
            console.error('Failed to update folder:', error);
            enqueueSnackbar(
                error?.message || 'Failed to update folder', 
                { variant: 'error' }
            );
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return {
        // Validation
        validateNewFolder,
        
        // API actions
        fetchWorkspaceTree,
        submitNewFolder,
        submitEditFolder,
        
    };
};
