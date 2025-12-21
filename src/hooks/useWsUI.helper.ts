/**
 * Workspace UI Helper
 * Business logic for workspace UI interactions
 */

import { useWsUIStore } from '@/store/ws/useWsUI.store';
import { Ws } from '@/store/ws/useWsList.store';

export const useWsUIHelper = () => {
    const {
        selectedWorkspace,
        setSelectedWorkspace,
        isDialogOpen,
        setIsDialogOpen,
        wsHasChanges,
        setWsHasChanges,
        originalWsRef,
    } = useWsUIStore();

    /**
     * Open workspace detail dialog
     */
    const openDialog = (workspace: Ws) => {
        setSelectedWorkspace(workspace);
        originalWsRef.current = JSON.parse(JSON.stringify(workspace)); // Deep clone
        setIsDialogOpen(true);
        setWsHasChanges(false);
    };

    /**
     * Close workspace detail dialog
     */
    const closeDialog = () => {
        setIsDialogOpen(false);
        setSelectedWorkspace(null);
        originalWsRef.current = null;
        setWsHasChanges(false);
    };

    /**
     * Update selected workspace (triggers unsaved changes flag)
     */
    const updateSelectedWorkspace = (updates: Partial<Ws>) => {
        if (!selectedWorkspace) return;

        const updatedWorkspace = { ...selectedWorkspace, ...updates };
        setSelectedWorkspace(updatedWorkspace);

        // Check if changes differ from original
        const hasChanges = JSON.stringify(updatedWorkspace) !== JSON.stringify(originalWsRef.current);
        setWsHasChanges(hasChanges);
    };

    /**
     * Reset workspace to original state
     */
    const resetWorkspace = () => {
        if (originalWsRef.current) {
            setSelectedWorkspace(JSON.parse(JSON.stringify(originalWsRef.current)));
            setWsHasChanges(false);
        }
    };

    return {
        openDialog,
        closeDialog,
        updateSelectedWorkspace,
        resetWorkspace,
    };
};
