import React from "react";
import { useSnackbar } from "notistack";
import { useKMovingTreeStore } from "../store/KMovingTree.store";
import { useKStore } from "../store/K.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { KService } from "../service/K.service";
import { KItemAction, KUpsertWorkspaceItemRequest } from "../types/K.types";
import { useKLoader } from "./useK.loader";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { useDragDropManager } from "react-dnd";
import { isFolder as isFolderV2, KItemV2 } from "../types/K-v2.types";
import {useConsoleHelper} from "../../../hooks/console/useConsole.helper";
import {KDTO} from "../types/K-dto.types";
import {KtreeMiniHelper} from "./Ktree.miniHelper";
import {kconstants} from "../utils/K.Constants";
import {SPECIAL_IDS} from "../utils/temp-id.utils";

export const useKMovingTreeHelper = () => {
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
    } = useKMovingTreeStore();

    const { allK, currentK, selectedItemIds, setSelectedItemIds } = useKStore();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { loadTree } = useKLoader();
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
            const result = await KService._getWorkspaceTreeV2($user.userToken, targetWorkspaceId);
            if (result.success && result.object) {
                setTargetWorkspace(result.object as KDTO);
            } else {
                throw new Error(result.message || "Failed to load target workspace");
            }
        } catch (error: any) {
            console.error("Failed to load target workspace:", error);
            _console.error(error?.message || "Failed to load target workspace");
        } finally {
            setIsLoadingTargetTree(false);
        }
    };

    // Check all items for duplicates and update highlights
    // Logic: Find items in currentK that also exist in targetWorkspace
    // Result: Highlight those duplicate items in targetTree (not in workspaceTree)
    const checkAndHighlightDuplicates = () => {
        if (!currentK || !targetWorkspace) {
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
        currentK.flatData.forEach((sourceItem) => {
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
        if (!currentK || !targetWorkspace) {
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
            const sourceItem = currentK.flatData.find((i) => i.id === itemId);
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

    // Handle cross-tree drop from KTree
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
                else if (isFolderV2(parentNodeData as unknown as KItemV2)) {
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

            // STEP 3: Validate workspace selection
            if (!currentK?.id || !targetWorkspaceId) {
                _console.error("No target workspace selected");
                return;
            }

            if (currentK.id === targetWorkspaceId) {
                _console.error("Cannot move to the same workspace");
                return;
            }

            // STEP 4: Check if dragging items are duplicates BEFORE calling API
            const { isDuplicate, duplicateCount, duplicateItems } = checkDraggingItemsAreDuplicate(dragItem);
            if (isDuplicate) {
                // Get target workspace name
                const targetWorkspaceName = allK.find((ws) => ws.id === targetWorkspaceId)?.name || "target workspace";

                // Show detailed message for each duplicate
                duplicateItems.forEach(({ sourceItem, targetItem }) => {
                    const itemTypeName = sourceItem.entityType === 1 ? "Note" : sourceItem.entityType === 2 ? "Folder" : "File";
                    const itemName = sourceItem.data.name;
                    _console.error(`${itemTypeName}: ${targetWorkspaceName} is already have ${itemTypeName}: ${itemName}`);
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
                } else {
                    // Fallback: Try to get from dragItem (for backward compatibility)
                    const draggedNodeIds = dragItem.dragIds || [dragItem.id];
                    itemIds = draggedNodeIds.map((strId: string) => parseInt(strId, 10)).filter((id: number) => !isNaN(id));
                    console.warn("⚠️ Fallback to dragItem.dragIds:", itemIds);
                }

                if (itemIds.length === 0) {
                    _console.error("No valid items to move");
                    return;
                }

                // STEP 5.0: Check for unsaved notes (id < 0)
                const unsavedItems = itemIds
                    .filter((id) => id < 0)
                    .map((id) => {
                        const item = currentK?.flatData.find((i) => i.id === id);
                        return item?.data?.name || "Untitled";
                    });

                if (unsavedItems.length > 0) {
                    const itemNames = unsavedItems.join(", ");
                    _console.error(`Please save "${itemNames}" before move`);
                    return;
                }

                // STEP 5.1: Prevent dragging root node
                const hasRootNode = itemIds.includes(kconstants.workspace.root.KworkspaceItemId);
                if (hasRootNode) {
                    _console.error("Cannot move workspace root node");
                    return;
                }

                // STEP 5.2: Filter to only top-level parents (prevent moving both parent and child)
                // Example: If selecting folder A and its subfolder B, only move A (B will follow automatically)

                // Build tree data from current workspace for hierarchy checking
                const currentTreeData = currentK ? KtreeMiniHelper.transformToTreeData(currentK, "") : [];

                // Filter to get only top-level parent IDs
                const topLevelItemIds = KtreeMiniHelper.filterTopLevelParents(itemIds, currentTreeData);
                if (topLevelItemIds.length === 0) {
                    _console.error("No valid items to move");
                    return;
                }

                // STEP 6: Build batch requests for MOVECROSS action
                // Use targetId (from drop position) instead of state
                // Only move top-level parents - children will follow automatically
                // check if any items are already in target workspace
                const itemsToMove = topLevelItemIds.filter((itemId: number) => {
                    const item = currentK?.flatData.find((fd) => fd.id === itemId);
                    if (item && item.workspaceId === targetWorkspaceId) {
                        console.warn(`Item ${itemId} already in target workspace ${targetWorkspaceId}, skipping`);
                        return false; // Skip this item
                    }
                    return true;
                });

                if (itemsToMove.length < topLevelItemIds.length) {
                    _console.error("Some items were already in the target workspace and were skipped");
                    return;
                }

                const requests: KUpsertWorkspaceItemRequest[] = itemsToMove.map((itemId: number) => ({
                    action: KItemAction.MoveCross,
                    id: itemId,
                    workspaceId: targetWorkspaceId,
                    parentId: targetId, // null = root, number = specific folder
                }));

                // STEP 7: Call batch API
                const result = await KService._upsertWorkspaceItems($user.userToken, currentK.id, requests);

                if (result.success) {
                    _console.success(`Moved ${itemsToMove.length} item(s) to target workspace`);

                    // STEP 8: Clear selection immediately (items no longer in this workspace)
                    setSelectedItemIds([]);

                    // STEP 9: Reload current workspace tree (to remove moved items from source)
                    await loadTree();

                    // STEP 10: Reload target workspace tree (to show moved items in target)
                    await loadTargetWorkspaceTree();

                    // Success - drag state will be cleared automatically
                } else {
                    _console.error(result.message || "Failed to move items");
                }
            } catch (error: any) {
                console.error("Failed to move items:", error);
                _console.error(error?.message || "Failed to move items");
            }
        } catch {
            console.error("Unexpected error during drop operation");
            _console.error("Unexpected error during move operation");
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

