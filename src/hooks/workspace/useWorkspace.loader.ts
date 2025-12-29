/**
 * Workspace Operation Helper Hook
 * Handles loading workspaces and their tree data
 *
 * @pattern Functions only - State should be accessed directly from useWorkspaceStore()
 * @returns {Object} Workspace operation functions only (no state)
 * @example
 * // Get state from store
 * const { allWorkspaces, currentWorkspace } = useWorkspaceStore();
 * // Get actions from helper
 * const { loadAllWorkspaces, selectWorkspace } = useWorkspaceLoader();
 */

import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { workspaceService } from "@/services/workspace.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import {ResultOptions} from "@/types/common.types";
import {WorkspaceDTO} from "@/types/workspace-dto.types";
import { WorkspaceItemV2 } from "@/types/workspace-v2.types";

export const useWorkspaceLoader = () => {
    const { $user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { allWorkspaces, setAllWorkspaces, currentWorkspace, setSelectedWorkspaceId,selectedWorkspaceId, setCurrentWorkspace, isLoadingWorkspaces, setIsLoadingWorkspaces, isLoadingTree, setIsLoadingTree } = useWorkspaceStore();

    /**
     * Load all user workspaces
     * Fetches ws and sets the first one as default
     */
    const loadAllWorkspaces = async () => {
        try {
            setIsLoadingWorkspaces(true);

            const token = $user.userToken;
            const data = await workspaceService._getAllUserWorkspaces(token);

            setAllWorkspaces(data);

            // Set default to first workspace if available and no tree loaded
            if (data.length > 0 && !currentWorkspace) {
                const defaultWorkspaceId = data[0].id;
                setSelectedWorkspaceId(defaultWorkspaceId);
                // Auto-load tree for default workspace
                // await loadTree(defaultWorkspaceId);
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
     *
     * Uses V2 API structure with full entity data
     * Applies user filters from profile (status code and deleted status)
     */
    const loadTree = async () => {
        if(selectedWorkspaceId == null){
            console.warn("selectedWorkspaceId is null, cant load tree")
            return
        }

        try {
            setIsLoadingTree(true);

            const token = $user.userToken;

            // Get current filters from user profile
            const filters = $user.filters?.workspace || {
                statusCode: "active",
                deletedAt: "null"
            };

            // Build filter params
            const params = {
                statusCode: filters.statusCode,
                deletedAt: filters.deletedAt
            };

            // Fetch workspace tree with V2 structure and filters
            console.log("🔧 Loading Workspace V2 API with filters:", params);
            const result: ResultOptions<WorkspaceDTO> = await workspaceService._getWorkspaceTreeV2(token, selectedWorkspaceId, params);
            if(result && result.success){
                const newWorkspace = {
                    ...result.object, 
                    flatData: [
                        ...result.object?.flatData ?? [], 
                        ...(currentWorkspace?.flatData ?? [])?.filter((item: WorkspaceItemV2) => item?.id<0) ] // KEEP CURRENT NEW FILE/NOTE,...
                } as WorkspaceDTO
                setCurrentWorkspace(newWorkspace);
                return result.object;
            }

        } catch (error) {
            throw error;
        } finally {
            setIsLoadingTree(false);
        }
    };



    return {
        // Actions only - get state directly from useWorkspaceStore()
        loadAllWorkspaces,
        loadTree,
    };
};
