/**
 * Workspace Operation Helper Hook
 * Handles loading workspaces and their tree data
 *
 * @pattern Functions only - State should be accessed directly from useExplorerStore()
 * @returns {Object} Workspace operation functions only (no state)
 * @example
 * // Get state from store
 * const { allWorkspaces, currentTree } = useExplorerStore();
 * // Get actions from helper
 * const { loadAllWorkspaces, selectWorkspace } = useWorkspaceOperation();
 */

import { useExplorerStore } from "@/store/explorer/Explorer.store";
import { _getAllUserWorkspaces, _getWorkspaceTree } from "@/services/workspace.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";

export const useWorkspaceOperation = () => {
    const { auth } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { allWorkspaces, setAllWorkspaces, currentTree, setCurrentTree, isLoadingWorkspaces, setIsLoadingWorkspaces, isLoadingTree, setIsLoadingTree } = useExplorerStore();

    /**
     * Load all user workspaces
     * Fetches workspace list and sets the first one as default
     */
    const loadAllWorkspaces = async () => {
        try {
            setIsLoadingWorkspaces(true);

            const token = auth.userToken;
            const data = await _getAllUserWorkspaces(token);

            setAllWorkspaces(data);

            // Set default to first workspace if available and no tree loaded
            if (data.length > 0 && !currentTree) {
                const defaultWorkspaceId = data[0].id;

                // Auto-load tree for default workspace
                await loadTree(defaultWorkspaceId);
            }

            return data;
        } catch (error) {
            console.error("❌ Failed to load workspaces:", error);
            throw error;
        } finally {
            setIsLoadingWorkspaces(false);
        }
    };

    /**
     * Load tree data for a specific workspace
     * Sets as current tree
     */
    const loadTree = async (workspaceId: number) => {
        try {
            setIsLoadingTree(true);

            const token = auth.userToken;
            const treeData = await _getWorkspaceTree(token, workspaceId);

            treeData.items = treeData.items.filter((item) => item.deletedAt === null);
            // Set as current tree
            setCurrentTree(treeData);

            return treeData;
        } catch (error) {
            throw error;
        } finally {
            setIsLoadingTree(false);
        }
    };

    /**
     * Select a workspace and load its tree
     */
    const selectWorkspace = async (workspaceId: number) => {
        // Load tree for selected workspace (will set currentTree which contains workspaceId)
        await loadTree(workspaceId);
    };

    return {
        // Actions only - get state directly from useExplorerStore()
        loadAllWorkspaces,
        loadTree,
        selectWorkspace,
    };
};
