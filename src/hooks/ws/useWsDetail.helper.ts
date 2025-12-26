/**
 * Workspace UI Helper
 * Business logic for workspace UI interactions
 */

import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { Ws } from "@/store/ws/useWs.store";

export const useWsDetailHelper = () => {
    const { selectedWorkspace, setSelectedWorkspace, setWsHasChanges, originalWsRef } = useWsDetailStore();

    /**
     * Update selected workspace (triggers unsaved changes flag)
     */
    const updateSelectedWorkspace = (updates: Partial<Ws>) => {
        if (!selectedWorkspace) {
            return;
        }

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
        updateSelectedWorkspace,
        resetWorkspace,
    };
};
