import React from "react";
import { useSnackbar } from "notistack";
import { useMovingTreeStore } from "@/store/workspace/MovingTree.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";
import { workspaceService } from "@/services/workspace.service";
import { WorkspaceItemAction, UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { useDragDropManager } from "react-dnd";
import { isFolder as isFolderV2, WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { SPECIAL_IDS } from "@/utils/temp-id.utils";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";

export const useMovingTreeHelper = () => {
    const {
        targetWorkspaceId,
        setTargetWorkspaceId,
        highlightedDuplicateIds,
        setHighlightedDuplicateIds,
        isLoadingTargetTree,
        setIsLoadingTargetTree,
        targetWorkspace,
        setTargetWorkspace,
        treeContainerRef,
        containerHeight,
        setContainerHeight,
        setTreeRenderKey,
    } = useMovingTreeStore();

    const { allWorkspaces, currentWorkspace, selectedItemIds, setSelectedItemIds } = useWorkspaceStore();
    const { $user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { loadTree } = useWorkspaceLoader();
    const manager = useDragDropManager();

    // Track highlight timeout to clear previous ones
    const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Handle workspace selection
    const handleWorkspaceChange = (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const newWorkspaceId = newValue?.id ? parseInt(newValue.id.toString()) : null;
        if (newWorkspaceId) {
            setTargetWorkspaceId(newWorkspaceId);
            setHighlightedDuplicateIds(new Set()); // Clear highlights when switching workspace
        } else {
            setTargetWorkspaceId(null);
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

    // Check all items for duplicates and update highlights
    // Logic: Find items in currentWorkspace that also exist in targetWorkspace
    // Result: Highlight those duplicate items in targetTree (not in workspaceTree)
    const checkAndHighlightDuplicates = () => {
        if (!currentWorkspace || !targetWorkspace) {
            setHighlightedDuplicateIds(new Set());
            return;
        }

        // Build map of target workspace items with composite key (entityType-entityId)
        const targetEntityMap = new Map<string, any>();
        targetWorkspace.flatData.forEach((item) => {
            const compositeKey = `${item.entityType}-${item.entityId}`;
            targetEntityMap.set(compositeKey, item);
        });

        // Check all items in current workspace for duplicates
        const duplicateCompositeKeys: string[] = [];
        currentWorkspace.flatData.forEach((sourceItem) => {
            const compositeKey = `${sourceItem.entityType}-${sourceItem.entityId}`;
            const targetItem = targetEntityMap.get(compositeKey);
            if (targetItem) {
                duplicateCompositeKeys.push(compositeKey);
            }
        });

        setHighlightedDuplicateIds(new Set(duplicateCompositeKeys));
    };

    // Check if dragging items contain duplicates and return details
    const checkDraggingItemsAreDuplicate = (
        draggedItem: any
    ): {
        isDuplicate: boolean;
        duplicateCount: number;
        duplicateItems: Array<{ sourceItem: any; targetItem: any }>;
    } => {
        if (!currentWorkspace || !targetWorkspace) {
            return { isDuplicate: false, duplicateCount: 0, duplicateItems: [] };
        }

        // Extract workspace_items.id from dragged items
        const draggedNodeIds = draggedItem.dragIds || [draggedItem.id];
        const itemIds = draggedNodeIds.map((strId: string) => parseInt(strId, 10)).filter((id: number) => !isNaN(id));

        // Build map of target workspace items with composite key (entityType-entityId)
        const targetEntityMap = new Map<string, any>();
        targetWorkspace.flatData.forEach((item) => {
            const compositeKey = `${item.entityType}-${item.entityId}`;
            targetEntityMap.set(compositeKey, item);
        });

        // Check each dragging item for duplicates
        const duplicateItems: Array<{ sourceItem: any; targetItem: any }> = [];
        itemIds.forEach((itemId: number) => {
            const sourceItem = currentWorkspace.flatData.find((i) => i.id === itemId);
            if (sourceItem) {
                const compositeKey = `${sourceItem.entityType}-${sourceItem.entityId}`;
                const targetItem = targetEntityMap.get(compositeKey);
                if (targetItem) {
                    duplicateItems.push({ sourceItem, targetItem });
                }
            }
        });

        return {
            isDuplicate: duplicateItems.length > 0,
            duplicateCount: duplicateItems.length,
            duplicateItems,
        };
    };

    // Handle cross-tree drop from WorkspaceTree
    const dropToMovingTree = async (args: any) => {
        try {
            // STEP 1: Extract dragged item from DnD monitor (for cross-tree drops, args.dragIds is empty)
            const monitor = manager.getMonitor();
            const dragItem = monitor.getItem();

            if (!dragItem) {
                console.warn("⚠️ No drag item found in monitor");
                return;
            }

            // STEP 2: Determine the correct parent folder id (workspace_items.id)
            let targetId: number | null = null;

            if (args.parentNode) {
                const parentNodeData = args.parentNode.data.data as any;

                // Check if dropped on drop zone → treat as root
                if (SPECIAL_IDS.includes(parentNodeData.entityId)) {
                    targetId = null;
                }
                // Check if parent node is a folder
                else if (isFolderV2(parentNodeData as unknown as WorkspaceItemV2)) {
                    // Drop into folder → use folder's entityId
                    targetId = parentNodeData.id;
                } else {
                    // Drop into note/file → use their parent folder entityId
                    targetId = parentNodeData.parentId ?? null;
                }
            } else {
                // No parent node → drop to root
                targetId = null;
            }

            console.log("📂 Drop target folder entityId:", targetId);

            // STEP 3: Validate workspace selection
            if (!currentWorkspace?.id || !targetWorkspaceId) {
                enqueueSnackbar("No target workspace selected", { variant: "error" });
                return;
            }

            if (currentWorkspace.id === targetWorkspaceId) {
                enqueueSnackbar("Cannot move to the same workspace", { variant: "error" });
                return;
            }

            // STEP 4: Check if dragging items are duplicates BEFORE calling API
            const { isDuplicate, duplicateCount, duplicateItems } = checkDraggingItemsAreDuplicate(dragItem);
            if (isDuplicate) {
                // Get target workspace name
                const targetWorkspaceName = allWorkspaces.find((ws) => ws.id === targetWorkspaceId)?.name || "target workspace";

                // Show detailed message for each duplicate
                duplicateItems.forEach(({ sourceItem, targetItem }) => {
                    const itemTypeName = sourceItem.entityType === 1 ? "Note" : sourceItem.entityType === 2 ? "Folder" : "File";
                    const itemName = sourceItem.data.name;
                    enqueueSnackbar(`${itemTypeName}: ${targetWorkspaceName} is already have ${itemTypeName}: ${itemName}`, { variant: "warning" });
                });

                // Highlight duplicates temporarily (5 seconds)
                const duplicateCompositeKeys = duplicateItems.map((d) => `${d.targetItem.entityType}-${d.targetItem.entityId}`);
                setHighlightedDuplicateIds(new Set(duplicateCompositeKeys));

                // Clear previous timeout if exists
                if (highlightTimeoutRef.current) {
                    clearTimeout(highlightTimeoutRef.current);
                }

                // Clear highlights after 5 seconds
                highlightTimeoutRef.current = setTimeout(() => {
                    setHighlightedDuplicateIds(new Set());
                    highlightTimeoutRef.current = null;
                }, 10000);

                return; // Prevent drop
            }

            try {
                // STEP 5: Extract workspace_items.id from dragged items
                // For cross-tree drops, dragItem.dragIds may be incomplete or undefined
                // Solution: Use selectedItemIds from store (always has full selection)
                let itemIds: number[];

                if (selectedItemIds && selectedItemIds.length > 0) {
                    // Use store's selectedItemIds (most reliable for cross-tree drops)
                    itemIds = selectedItemIds;
                    console.log("✅ Using selectedItemIds from store:", itemIds);
                } else {
                    // Fallback: Try to get from dragItem (for backward compatibility)
                    const draggedNodeIds = dragItem.dragIds || [dragItem.id];
                    itemIds = draggedNodeIds.map((strId: string) => parseInt(strId, 10)).filter((id: number) => !isNaN(id));
                    console.log("⚠️ Fallback to dragItem.dragIds:", itemIds);
                }

                if (itemIds.length === 0) {
                    enqueueSnackbar("No valid items to move", { variant: "error" });
                    return;
                }

                // STEP 5.0: Check for unsaved notes (id < 0)
                const unsavedItems = itemIds
                    .filter((id) => id < 0)
                    .map((id) => {
                        const item = currentWorkspace?.flatData.find((i) => i.id === id);
                        return item?.data?.name || "Untitled";
                    });

                if (unsavedItems.length > 0) {
                    const itemNames = unsavedItems.join(", ");
                    enqueueSnackbar(`Please save "${itemNames}" before move`, { variant: "error" });
                    return;
                }

                // STEP 5.1: Prevent dragging root node
                const hasRootNode = itemIds.includes(constants.workspace.root.workspaceItemId);
                if (hasRootNode) {
                    enqueueSnackbar("Cannot move workspace root node", { variant: "error" });
                    return;
                }

                // STEP 5.2: Filter to only top-level parents (prevent moving both parent and child)
                // Example: If selecting folder A and its subfolder B, only move A (B will follow automatically)

                // Build tree data from current workspace for hierarchy checking
                const currentTreeData = currentWorkspace ? treeMiniHelper.transformToTreeData(currentWorkspace, "") : [];

                // Filter to get only top-level parent IDs
                const topLevelItemIds = treeMiniHelper.filterTopLevelParents(itemIds, currentTreeData);
                if (topLevelItemIds.length === 0) {
                    enqueueSnackbar("No valid items to move", { variant: "error" });
                    return;
                }

                // STEP 6: Build batch requests for MOVECROSS action
                // Use targetId (from drop position) instead of state
                // Only move top-level parents - children will follow automatically
                const requests: UpsertWorkspaceItemRequest[] = topLevelItemIds.map((itemId: number) => ({
                    action: WorkspaceItemAction.MoveCross,
                    id: itemId,
                    workspaceId: targetWorkspaceId,
                    parentId: targetId, // null = root, number = specific folder
                }));

                // STEP 7: Call batch API
                const result = await workspaceService._upsertWorkspaceItems($user.userToken, currentWorkspace.id, requests);

                if (result.success) {
                    enqueueSnackbar(`Moved ${itemIds.length} item(s) to target workspace`, { variant: "success" });

                    // STEP 8: Reload current workspace tree
                    await loadTree();

                    // STEP 9: Reload target workspace tree and re-detect duplicates
                    await loadTargetWorkspaceTree();

                    // Success - drag state will be cleared automatically
                } else {
                    enqueueSnackbar(result.message || "Failed to move items", { variant: "error" });
                }
            } catch (error: any) {
                console.error("Failed to move items:", error);
                enqueueSnackbar(error?.message || "Failed to move items", { variant: "error" });
            }
        } catch {
            console.error("Unexpected error during drop operation");
            enqueueSnackbar("Unexpected error during move operation", { variant: "error" });
        } finally {
            setTreeRenderKey((prev) => prev + 1);
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
        handleWorkspaceChange,
        loadTargetWorkspaceTree,
        dropToMovingTree,
        initializeContainerHeightTracking,
        checkDraggingItemsAreDuplicate,
        checkAndHighlightDuplicates,
    };
};
