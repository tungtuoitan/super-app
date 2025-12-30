import { useSnackbar } from "notistack";
import { useMovingTreeStore } from "@/store/workspace/MovingTree.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";
import { workspaceService } from "@/services/workspace.service";
import { WorkspaceItemAction, UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";

export const useMovingTreeHelper = () => {
    const {
        targetWorkspaceId,
        setTargetWorkspaceId,
        targetFolderId,
        setTargetFolderId,
        duplicateEntityIds,
        setDuplicateEntityIds,
        isLoadingTargetTree,
        setIsLoadingTargetTree,
        targetWorkspace,
        setTargetWorkspace,
        treeContainerRef,
        containerHeight,
        setContainerHeight,
    } = useMovingTreeStore();

    const { allWorkspaces, currentWorkspace } = useWorkspaceStore();
    const { $user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { loadTree } = useWorkspaceLoader();

    // Filter workspaces (exclude current workspace)
    const getAvailableWorkspaces = (): IAutoCompleteOptions[] => {
        return allWorkspaces
            .filter((ws) => ws.id !== currentWorkspace?.id)
            .map((ws) => ({
                id: ws.id.toString(),
                label: ws.name,
                desc: ws.description || ws.name,
                active: true,
            }));
    };

    // Handle workspace selection
    const handleWorkspaceChange = (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const newWorkspaceId = newValue?.id ? parseInt(newValue.id.toString()) : null;
        if (newWorkspaceId) {
            setTargetWorkspaceId(newWorkspaceId);
            setTargetFolderId(null);
            setDuplicateEntityIds(new Set());
        } else {
            setTargetWorkspaceId(null);
            setTargetFolderId(null);
        }
    };

    // Load target workspace tree
    const loadTargetWorkspaceTree = async () => {
        if (!targetWorkspaceId || !$user.userToken) {
            setTargetWorkspace(null);
            return;
        }

        setTargetWorkspace(null);
        setIsLoadingTargetTree(true);

        try {
            const result = await workspaceService._getWorkspaceTreeV2($user.userToken, targetWorkspaceId);
            if (result.success && result.object) {
                setTargetWorkspace(result.object as WorkspaceDTO);
            } else {
                throw new Error(result.message || "Failed to load target workspace");
            }
        } catch (error: any) {
            console.error("Failed to load target workspace:", error);
            enqueueSnackbar(error?.message || "Failed to load target workspace", { variant: "error" });
        } finally {
            setIsLoadingTargetTree(false);
        }
    };

    // Handle cross-tree drop from WorkspaceTree
    const dropToMovingTree = async (draggedItem: any, targetFolder: number | null = null) => {
        console.log("🎯 Cross-tree drop:", draggedItem);
        console.log("📂 Target folder:", targetFolder);

        if (!currentWorkspace?.id || !targetWorkspaceId) {
            enqueueSnackbar("No target workspace selected", { variant: "error" });
            return;
        }

        if (currentWorkspace.id === targetWorkspaceId) {
            enqueueSnackbar("Cannot move to the same workspace", { variant: "error" });
            return;
        }

        try {
            // Extract workspace_items.id from dragged items
            // draggedItem from react-arborist has format: {id: '17', dragIds: ['17', '18', ...]}
            // dragIds contains all selected node ids (strings)
            const draggedNodeIds = draggedItem.dragIds || [draggedItem.id];

            // Convert string ids to numbers (TreeFolder.id is string version of workspace_items.id)
            const itemIds = draggedNodeIds.map((strId: string) => parseInt(strId, 10)).filter((id: number) => !isNaN(id));

            if (itemIds.length === 0) {
                enqueueSnackbar("No valid items to move", { variant: "error" });
                return;
            }

            // Check for duplicates
            const sourceEntityIds = new Set<number>();
            for (const itemId of itemIds) {
                const item = currentWorkspace.flatData.find((i) => i.id === itemId);
                if (item) {
                    sourceEntityIds.add(item.entityId);
                }
            }

            const duplicates = new Set<number>();
            if (targetWorkspace) {
                for (const targetItem of targetWorkspace.flatData) {
                    if (sourceEntityIds.has(targetItem.entityId)) {
                        duplicates.add(targetItem.entityId);
                    }
                }
            }

            if (duplicates.size > 0) {
                enqueueSnackbar(`Cannot move: ${duplicates.size} item(s) already exist in target workspace`, { variant: "error" });
                return;
            }

            // Build batch requests for MOVECROSS action
            // Use targetFolder parameter (from drop position) instead of state
            const requests: UpsertWorkspaceItemRequest[] = itemIds.map((itemId: number) => ({
                action: WorkspaceItemAction.MoveCross,
                id: itemId,
                workspaceId: targetWorkspaceId,
                parentId: targetFolder, // null = root, number = specific folder
            }));

            // Call batch API
            const result = await workspaceService._upsertWorkspaceItems($user.userToken, currentWorkspace.id, requests);

            if (result.success) {
                enqueueSnackbar(`Moved ${itemIds.length} item(s) to target workspace`, { variant: "success" });

                // Reload current workspace tree
                await loadTree();

                // Reload target workspace tree
                const targetResult = await workspaceService._getWorkspaceTreeV2($user.userToken, targetWorkspaceId);
                if (targetResult.success && targetResult.object) {
                    setTargetWorkspace(targetResult.object as WorkspaceDTO);
                }
            } else {
                enqueueSnackbar(result.message || "Failed to move items", { variant: "error" });
            }
        } catch (error: any) {
            console.error("Failed to move items:", error);
            enqueueSnackbar(error?.message || "Failed to move items", { variant: "error" });
        }
    };

    // Track container height for responsive tree
    const initializeContainerHeightTracking = () => {
        const updateHeight = () => {
            if (treeContainerRef.current) {
                const height = treeContainerRef.current.clientHeight;
                if (height && typeof height === "number" && height > 0) {
                    setContainerHeight(height);
                }
            }
        };

        // Initial height with delay to ensure DOM is ready
        setTimeout(updateHeight, 100);

        // Observe container size changes
        const resizeObserver = new ResizeObserver(updateHeight);
        if (treeContainerRef.current) {
            resizeObserver.observe(treeContainerRef.current);
        }

        // Also listen to window resize
        window.addEventListener("resize", updateHeight);

        // Return cleanup function
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    };

    return {
        getAvailableWorkspaces,
        handleWorkspaceChange,
        loadTargetWorkspaceTree,
        dropToMovingTree,
        initializeContainerHeightTracking,
    };
};