/**
 * KWorkspace Operation Helper Hook
 * Handles loading workspaces and their tree data
 *
 * @pattern Functions only - State should be accessed directly from useKWorkspaceStore()
 * @returns {Object} KWorkspace operation functions only (no state)
 * @example
 * // Get state from store
 * const { allWorkspaces, currentWorkspace } = useKWorkspaceStore();
 * // Get actions from helper
 * const { KloadAllWorkspaces, selectWorkspace } = KuseWorkspaceLoader();
 */

import { useKWorkspaceStore } from "@/store/K/K.store";
import { KWorkspaceService } from "@/services/K.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useSnackbar } from "notistack";
import {ResultOptions} from "@/types/common.types";
import {KWorkspaceDTO} from "@/types/K-dto.types";
import { KWorkspaceItemV2 } from "@/types/K-v2.types";
import {KuseMovingTreeStore} from "@/store/K/KMovingTree.store";
import {useConsoleHelper} from "../console/useConsole.helper";

export const KuseWorkspaceLoader = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { allWorkspaces, setAllWorkspaces, currentWorkspace, setSelectedWorkspaceId, selectedWorkspaceId, setCurrentWorkspace, isLoadingWorkspaces, setIsLoadingWorkspaces, isLoadingTree, setIsLoadingTree } = useKWorkspaceStore();
    const { setTargetWorkspaceId } = KuseMovingTreeStore();

    /**
     * Load all user workspaces
     * Fetches ws and sets the first one as default
     */
    const KloadAllWorkspaces = async () => {
        try {
            setIsLoadingWorkspaces(true);

            const token = $user.userToken;
            const data = await KWorkspaceService._getAllUserWorkspaces(token);

            setAllWorkspaces(data);

            // Set default to first workspace if available and no tree loaded
            if (data.length > 0 && !currentWorkspace) {
                const defaultWorkspaceId = data[0].id;
                setSelectedWorkspaceId(defaultWorkspaceId);
                if(data.length > 1){
                    setTargetWorkspaceId(data.length > 0 ? data[1].id : null); //* set 1 workspace bất kì miễn khác selectedWorkspaceId
                }
                // Auto-load tree for default workspace
                // await loadTree(defaultWorkspaceId);
            }

            return data;
        } catch (error) {
            console.error("❌ Failed to load kworkspaces:", error);
            throw error;
        } finally {
            setIsLoadingWorkspaces(false);
        }
    };

    /**
     * Load tree data for a specific workspace
     * Sets as current tree
     *
     * ⚠️ PERFORMANCE NOTE - FILTERING MOVED TO FRONTEND:
     * Uses V2 API structure with full entity data (ALL items, no server filtering).
     * Frontend will filter by deletedAt, statusCode, and search text.
     *
     * User filter preferences are stored in $user.filters.workspace but NOT sent to backend.
     * Filtering happens in transformToTreeData() in Ktree.miniHelper.ts
     *
     * @param calculatedVirtualItems - Optional array of virtual items (ID < 0) to preserve in state
     * @param targetWorkspaceId - Optional workspace ID to load. If not provided, uses selectedWorkspaceId
     * @returns The loaded workspace data
     */
    const loadTree = async (calculatedVirtualItems?: KWorkspaceItemV2[], targetWorkspaceId?: number): Promise<KWorkspaceDTO | undefined> => {
        const workspaceIdToLoad = targetWorkspaceId ?? selectedWorkspaceId;

        if(workspaceIdToLoad == null){
            console.warn("workspaceId is null, cant load tree")
            return
        }

        try {
            setIsLoadingTree(true);

            const token = $user.userToken;

            // Fetch workspace tree with V2 structure (ALL items, no filtering)
            const result: ResultOptions<KWorkspaceDTO> = await KWorkspaceService._getWorkspaceTreeV2(token, workspaceIdToLoad);
            if(result && result.success){
                // Merge data: API data + existing virtual items (ID < 0) + new virtual items
                const existingVirtualItems = (currentWorkspace?.flatData ?? []).filter((item: KWorkspaceItemV2) => item?.id < 0);
                const mergedVirtualItems = calculatedVirtualItems
                    ? calculatedVirtualItems // Use provided virtual items (updated)
                    : existingVirtualItems; // Keep existing virtual items

                const newWorkspace = {
                    ...result.object,
                    flatData: [
                        ...result.object?.flatData ?? [],
                        ...mergedVirtualItems // KEEP VIRTUAL ITEMS (NEW FILE/NOTE/FOLDER,...)
                    ]
                } as KWorkspaceDTO;

                setCurrentWorkspace(newWorkspace);
                return newWorkspace;
            }

        } catch (error) {
            throw error;
        } finally {
            setTimeout(() => {
                setIsLoadingTree(false)
            }, 100);
        }
    };



    return {
        // Actions only - get state directly from useKWorkspaceStore()
        KloadAllWorkspaces,
        loadTree,
    };
};
