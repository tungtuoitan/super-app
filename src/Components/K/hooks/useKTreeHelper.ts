/**
 * Tree Operation Helper Hook
 * Handles tree operations: drag & drop, refresh, new folder
 */

import type { KTreeNode } from "./Ktree.miniHelper";
import { KtreeMiniHelper } from "./Ktree.miniHelper";
import { useKStore } from "../store/K.store";
import { useKNodeDialogHelper } from "./useKNodeDialog.helper";
import { useKLoader } from "./useK.loader";
import { KService } from "../service/K.service";
import { KItemAction } from "../types/K.types";
import { useAuthStore } from "@/store/auth/Auth.store";
import { KItemV2 } from "../types/K-v2.types";
import {useConsoleHelper} from "../../../hooks/console/useConsole.helper";
import {useStandardRegistryHelper} from "../../../hooks/standardRegistry/useStandardRegistry.helper";
import {kconstants} from "../utils/K.Constants";
import {SPECIAL_IDS} from "../utils/temp-id.utils";

export const KuseTreeHelper = () => {
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, setIsDragging, currentK } = useKStore();

    const { openNodeDialog } = useKNodeDialogHelper();
    const { loadTree } = useKLoader(); 
    const _console = useConsoleHelper();
    const { $user } = useAuthStore();
    const { loadKeywords } = useStandardRegistryHelper();

    /**
     * Handle drag and drop - SUPPORTS MULTI-ITEM DRAG (folders, notes, files)
     *
     * KEY CONCEPTS:
     * - KTreeNode.id = string version of workspace_items.id (for react-arborist)
     * - KTreeNode.data.id = workspace_items.id (workspace item ID)
     * - KTreeNode.data.entityId = entity ID (folders.id | notes.id | files.id)
     * - KTreeNode.data.parentId = parent workspace_items.id (SELF-REFERENCING, NOT entity ID!)
     *
     * ALGORITHM:
     * 1. Extract entity IDs from dragged items (for selection tracking)
     * 2. Determine drop target (parent workspace_items.id or root)
     * 3. Validate move (prevent invalid moves)
     * 4. Build MOVE batch request with workspace_items.id + new parent workspace_items.id
     * 5. Call API and refresh tree
     */
    const handleMove = async (args: { dragIds: string[]; parentId: string | null; index: number }, treeData: KTreeNode[]) => {
        try {
            setIsDragging(true);

            // -------------------------------------------------------
            // STEP 1: EXTRACT WORKSPACE_ITEMS.ID FROM DRAGGED ITEMS
            // -------------------------------------------------------
            const allNodes = KtreeMiniHelper.$traverse(treeData);

            // ---- Filter out the drop zone node and root node (virtual nodes with special IDs) ----
            const validNodes = allNodes.filter((node) => {
                return node.data.id !== kconstants.workspace.dropZone.workspaceItemId && node.data.id !== kconstants.workspace.root.workspaceItemId;
            });

            let selectedItemIds = args.dragIds
                .map((dragId) => {
                    const item = validNodes.find((t) => t.id === dragId);
                    return item ? item.data.id : undefined;
                })
                .filter((id): id is number => {
                    // Filter out undefined, drop zone ID, and root ID
                    return id !== undefined && id !== kconstants.workspace.dropZone.workspaceItemId && id !== kconstants.workspace.root.workspaceItemId;
                });

            // ---- get only top-level parents from selected items ----
            selectedItemIds = KtreeMiniHelper.filterTopLevelParents(selectedItemIds, treeData);

            if (selectedItemIds.length === 0) {
                setIsDragging(false);
                return;
            }

            // -------------------------------------------------------
            // STEP 2: DETERMINE TARGET PARENT WORKSPACE_ITEMS.ID
            // -------------------------------------------------------
            // IMPORTANT: args.parentId (from react-arborist) can be:
            // 1. null - dropping at root level (bottom of tree)
            // 2. Folder's tree node ID - dropping INTO a folder
            // 3. Note/file's tree node ID - dropping BETWEEN siblings (use their parent)
            // 4. Drop zone ID (special ID -1) - dropping at root level
            //
            // OUTPUT: newParentId = parent's workspace_items.id or undefined for root
            let newParentId: number | undefined = undefined;

            if (!args.parentId) {
                // ---- Case 1: Drop at root level (bottom of tree) ----
                newParentId = undefined;
            } else {
                const targetNode = validNodes.find((t) => t.id === args.parentId);

                if (!targetNode) {
                    // ---- Check if it's the drop zone node ----
                    const dropZoneNode = allNodes.find((t) => t.id === args.parentId);
                    if (dropZoneNode && dropZoneNode.data.id === kconstants.workspace.dropZone.workspaceItemId) {
                        newParentId = undefined;

                        // ---- VALIDATION: If all items already root-level, prevent drop ----
                        const allAlreadyRoot = selectedItemIds.every((id) => {
                            const item = validNodes.find((t) => t.data.id === id);
                            return !item?.data.parentId || item.data.parentId === null;
                        });
                        if (allAlreadyRoot) {
                            console.warn("⚠️ All items are already at root level");
                            setIsDragging(false);
                            return;
                        }
                    } else {
                        // ---- Parent node not found - treat as root level drop ----
                        newParentId = undefined;
                    }
                } else {
                    const targetItemId = targetNode.data.id; // workspace_items.id

                    // ---- workspace root nodes, drop zone ----
                    if (SPECIAL_IDS.includes(targetItemId)) {
                        newParentId = undefined; // Move to workspace root
                    } else {
                        // const targetNodeData = targetNode.data;

                        // ---- VALIDATION: Check if all items already have this parent ----
                        const allSameParent = selectedItemIds.every((id: number) => {
                            const item = validNodes.find((t) => t.data.id === id);
                            if (!item) return false;
                            const currentParentId = "parentId" in item.data ? item.data.parentId : undefined;
                            return currentParentId === targetItemId;
                        });

                        if (allSameParent) {
                            console.warn("⚠️ All items already have this parent - no change needed");
                            setIsDragging(false);
                            return;
                        }

                        newParentId = targetItemId;
                        
                        // ---- Check if this is a folder (V2: entityType === 2) ----
                        // const isFolder = "entityType" in targetNodeData && targetNodeData.entityType === 2;

                        // if (isFolder) {
                        //     // ---- Dropping INTO a folder ----
                        //     newParentId = targetItemId;
                        // } else {
                        //     // ---- Dropping BETWEEN siblings - use their parent ----
                        //     newParentId = targetNodeData.parentId ?? undefined;
                        // }
                    }
                }
            }

            // -------------------------------------------------------
            // STEP 3: VALIDATION - PREVENT INVALID MOVES
            // -------------------------------------------------------
            const hasWorkspaceRoot = selectedItemIds.some((id) => id === kconstants.workspace.root.workspaceItemId);
            if (hasWorkspaceRoot) {
                console.warn("⚠️ Cannot move workspace root node");
                setIsDragging(false);
                return;
            }

            if (newParentId !== undefined && selectedItemIds.includes(newParentId)) {
                console.warn("⚠️ Cannot move items into one of the selected items");
                setIsDragging(false);
                return;
            }

            if (newParentId !== undefined) {
                const isTargetDescendantOfSelected = selectedItemIds.some((draggedId) => {
                    return KtreeMiniHelper.isDescendant(newParentId!, draggedId, treeData);
                });

                if (isTargetDescendantOfSelected) {
                    console.warn("⚠️ Cannot move items into a descendant of selected items");
                    setIsDragging(false);
                    return;
                }
            }

            // -------------------------------------------------------
            // STEP 4: VALIDATE DROP POSITION
            // -------------------------------------------------------
            const targetNode = newParentId !== undefined ? KtreeMiniHelper.$traverse(treeData).find((t) => t.data.id === newParentId) : null;

            // ---- Filter out workspace root and drop zone ----
            const targetSiblings = targetNode
                ? targetNode.children || []
                : treeData.filter((t) => {
                      const workspaceItemId = t.data.id;
                      return workspaceItemId > 0 && workspaceItemId !== kconstants.workspace.dropZone.workspaceItemId;
                  });

            // ---- VALIDATION: Check same parent - different logic for single vs multi-select ----
            if (selectedItemIds.length === 1) {
                // ---- Single select: If parent is target, no move needed ----
                const draggedItemId = selectedItemIds[0];
                const draggedItem = validNodes.find((t) => t.data.id === draggedItemId);

                if (draggedItem) {
                    const currentParentId = "parentId" in draggedItem.data ? draggedItem.data.parentId : undefined;
                    const normalizedCurrentParent = currentParentId ?? null;
                    const normalizedTargetParent = newParentId ?? null;

                    if (normalizedCurrentParent === normalizedTargetParent) {
                        console.warn("⚠️ Item already has this parent - no move needed");
                        setIsDragging(false);
                        return;
                    }
                }
            } else {
                // ---- Multi-select: Remove items that already have target parent ----
                const itemsToMove = selectedItemIds.filter((id) => {
                    const item = validNodes.find((t) => t.data.id === id);
                    if (!item) return false;

                    const currentParentId = "parentId" in item.data ? item.data.parentId : undefined;
                    const normalizedCurrentParent = currentParentId ?? null;
                    const normalizedTargetParent = newParentId ?? null;

                    // Keep items that don't have target parent
                    return normalizedCurrentParent !== normalizedTargetParent;
                });

                // If all items already have target parent, no move needed
                if (itemsToMove.length === 0) {
                    console.warn("⚠️ All items already have target parent - no move needed");
                    setIsDragging(false);
                    return;
                }

                // Update selectedItemIds to only include items that need to move
                selectedItemIds = itemsToMove;
            }

            if (args.index >= 0 && args.index <= targetSiblings.length) {
                const itemBefore = args.index > 0 ? targetSiblings[args.index - 1] : null;
                const itemAfter = args.index < targetSiblings.length ? targetSiblings[args.index] : null;

                const itemBeforeId = itemBefore ? itemBefore.data.id : null;
                const itemAfterId = itemAfter ? itemAfter.data.id : null;

                const bothInSelection = itemBeforeId && selectedItemIds.includes(itemBeforeId) && itemAfterId && selectedItemIds.includes(itemAfterId);

                const hasSiblingsInSelection = targetSiblings.some((sibling) => {
                    const siblingWorkspaceItemId = sibling.data.id;
                    return selectedItemIds.includes(siblingWorkspaceItemId);
                });

                if (
                    bothInSelection ||
                    (hasSiblingsInSelection && ((itemBeforeId && selectedItemIds.includes(itemBeforeId)) || (itemAfterId && selectedItemIds.includes(itemAfterId))))
                ) {
                    console.warn("⚠️ Cannot drop between items in the same selection");
                    setIsDragging(false);
                    return;
                }
            }

            // -------------------------------------------------------
            // STEP 5: FILTER TOP-LEVEL ITEMS (EXCLUDE DESCENDANTS)
            // -------------------------------------------------------
            // VS CODE BEHAVIOR: When moving b > c into d, only move b (c follows as child of b)
            // This preserves parent-child relationships within the selection
            // IMPORTANT: Do this BEFORE splitting real/virtual, because:
            // - Real item can be child of virtual item
            // - Virtual item can be child of real item
            const itemsNeedUpdate = selectedItemIds.filter((workspaceItemId) => {
                const isDescendantOfOtherSelected = selectedItemIds.some((otherItemId) => {
                    if (otherItemId === workspaceItemId) return false;
                    return KtreeMiniHelper.isDescendant(workspaceItemId, otherItemId, treeData);
                });
                return !isDescendantOfOtherSelected;
            });

            // -------------------------------------------------------
            // STEP 6: SPLIT INTO 2 FLOWS: REAL IDS (API) & VIRTUAL IDS (STATE ONLY)
            // -------------------------------------------------------
            // Split itemsNeedUpdate into:
            // - realItemsNeedUpdate (>0): Real items in database → Call API
            // - virtualItemsNeedUpdate (<0): Virtual items (workspace root, drop zone) → Update state only
            const realItemsNeedUpdate = itemsNeedUpdate.filter((id) => id > 0);
            const virtualItemsNeedUpdate = itemsNeedUpdate.filter((id) => id < 0);

            // -------------------------------------------------------
            // FLOW 1: UPDATE REAL ITEMS VIA API (ID > 0)
            // -------------------------------------------------------
            if (realItemsNeedUpdate.length > 0) {
                if (!currentK?.id) {
                    console.error("❌ No workspace ID found");
                    setIsDragging(false);
                    return;
                }

                const workspaceId = currentK.id;

                // ---- Build batch MOVE request for real items ----
                // For each real workspace item, create a MOVE action with:
                // - action: WorkspaceItemAction.Move (explicit action enum)
                // - id: workspace_items.id (already have it!)
                // - parentId: new parent's workspace_items.id (SELF-REFERENCING) or null for root
                // Note: Descendants already filtered out in STEP 5
                const batchRequests = realItemsNeedUpdate.map((workspaceItemId) => {
                    return {
                        action: KItemAction.Move,
                        id: workspaceItemId, // ✅ workspace_items.id (primary key)
                        parentId: newParentId ?? null, // ✅ Parent's workspace_items.id
                    };
                });

                try {
                    const result = await KService._upsertWorkspaceItems($user.userToken, workspaceId, batchRequests);
                    if (!result.success) {
                        throw new Error("Move API returned unsuccessful response");
                    }

                } catch (error) {
                    console.error(`❌ Failed to move real items:`, error);

                    // Show error toast with user-friendly message
                    _console.error("Failed to move items. Please try again.");

                    throw error;
                }
            }

            // -------------------------------------------------------
            // FLOW 2: UPDATE VIRTUAL ITEMS IN STATE ONLY (ID < 0)
            // -------------------------------------------------------
            let updatedVirtualItems: KItemV2[] = [];
            let allNewVirtualItems: KItemV2[] = [];
            if (virtualItemsNeedUpdate.length > 0) {
                updatedVirtualItems = virtualItemsNeedUpdate
                    .map((workspaceItemId) => {
                        const item = allNodes.find((t) => t.data.id === workspaceItemId);
                        if (!item) return null;

                        // Update parentId in virtual item
                        // Cast to KItemV2 since KTreeNode.data is KItemV2
                        const updatedData: KItemV2 = {
                            ...(item.data as any),
                            parentId: newParentId ?? null,
                        };

                        return updatedData;
                    })
                    .filter((item): item is KItemV2 => item !== null);

                // Virtual descendants - keep as-is (parentId unchanged because they follow their parent)
                const otherVirtualItems = allNodes.filter((n) => n.data.id < 0 && !SPECIAL_IDS.includes(n.data.id) && !virtualItemsNeedUpdate.includes(n.data.id)).map((node) => node.data as any as KItemV2);

                // Combine both
                allNewVirtualItems = [...updatedVirtualItems, ...otherVirtualItems];

            }

            // -------------------------------------------------------
            // SUCCESS: Show toast for all moved items
            // -------------------------------------------------------
            const totalMoved = realItemsNeedUpdate.length + virtualItemsNeedUpdate.length;
            if (totalMoved > 0) {
                _console.success(`Successfully moved ${totalMoved} item(s)`);
            }

            // -------------------------------------------------------
            // STEP 7: REFRESH TREE & RESTORE SELECTION
            // -------------------------------------------------------
            // Pass virtual items to preserve them in state during reload
            await loadTree(allNewVirtualItems.length > 0 ? allNewVirtualItems : undefined);
            loadKeywords()

            // VS Code behavior: Re-select the moved items after move completes
            // Use itemsNeedUpdate (top-level items) instead of selectedEntityIds (includes descendants)
            setSelectedItemIds(itemsNeedUpdate);
            if (itemsNeedUpdate.length > 0) {
                setLastSelectedItemId(itemsNeedUpdate[itemsNeedUpdate.length - 1]);
            }
        } catch (error) {
            console.error("❌ Failed to move item(s):", error);

            // Show error toast to user
            _console.error("An error occurred while moving items");
        } finally {
            setIsDragging(false);
        }
    };

    /**
     * Handle new folder action
     * Opens create dialog with selected folder as parent
     */
    const addNewFolder = (treeData: KTreeNode[]) => {
        const parentId = selectedItemIds.length > 0 ? selectedItemIds[0] : undefined;

        // Extract nodes from treeData, find parent node by k_items.id
        const allNodes = KtreeMiniHelper.$traverse(treeData).map((t) => t.data);
        const parentNode = parentId ? allNodes.find((n) => n.id === parentId) as unknown as import("../types").Folder | undefined : undefined;

        openNodeDialog("create", kconstants.workspace.itemTypes.node, null, parentNode ?? null);
    };

    return {
        handleMove,
        addNewFolder,
    };
};
