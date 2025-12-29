/**
 * Tree Operation Helper Hook
 * Handles tree operations: drag & drop, refresh, new folder
 */

import type { TreeFolder } from "./tree.miniHelper";
import { treeMiniHelper } from "./tree.miniHelper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useFolderDialogHelper } from "./useFolderDialog.helper";
import { useWorkspaceLoader } from "./useWorkspace.loader";
import { constants } from "@/utils/constants";
import { workspaceService } from "@/services/workspace.service";
import type { MoveItemsRequest } from "@/types/workspace.types";
import { WorkspaceItemAction } from "@/types/workspace.types";
import { Folder } from "@/types/index";
import { useSnackbar } from "notistack";
import { useAuthStore } from "@/store/auth/Auth.store";

export const useTreeHelper = () => {
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, setIsDragging, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

    const { openFolderDialog } = useFolderDialogHelper();
    const { loadTree } = useWorkspaceLoader();
    const { enqueueSnackbar } = useSnackbar();
    const { $user } = useAuthStore();

    /**
     * Handle drag and drop - SUPPORTS MULTI-ITEM DRAG (folders, notes, files)
     *
     * KEY CONCEPTS:
     * - TreeFolder.id = string version of workspace_items.id (for react-arborist)
     * - TreeFolder.data.id = workspace_items.id (workspace item ID)
     * - TreeFolder.data.entityId = entity ID (folders.id | notes.id | files.id)
     * - TreeFolder.data.parentId = parent workspace_items.id (SELF-REFERENCING, NOT entity ID!)
     *
     * ALGORITHM:
     * 1. Extract entity IDs from dragged items (for selection tracking)
     * 2. Determine drop target (parent workspace_items.id or root)
     * 3. Validate move (prevent invalid moves)
     * 4. Build MOVE batch request with workspace_items.id + new parent workspace_items.id
     * 5. Call API and refresh tree
     */
    const handleMove = async (args: { dragIds: string[]; parentId: string | null; index: number }, treeData: TreeFolder[]) => {
        try {
            console.log("🚀 handleMove called:", { dragIds: args.dragIds, parentId: args.parentId, index: args.index });

            setIsDragging(true);

            // -------------------------------------------------------
            // STEP 1: EXTRACT ENTITY IDS FROM DRAGGED ITEMS
            // -------------------------------------------------------
            const allTreeNodes = treeMiniHelper.$traverse(treeData);

            /**
             * Helper: Extract entity ID from tree node
             * Returns: folders.id | notes.id | files.id (NOT workspace_items.id!)
             */
            const getEntityId = (node: any) => node.data.entityId;

            // ---- Filter out the drop zone node and root node (virtual nodes with special IDs) ----
            const validTreeNodes = allTreeNodes.filter((node) => {
                const entityId = getEntityId(node);
                return entityId !== constants.workspace.dropZone.entityId && entityId !== constants.workspace.root.entityId;
            });

            let selectedEntityIds = args.dragIds
                .map((dragId) => {
                    const item = validTreeNodes.find((t) => t.id === dragId);
                    return item ? getEntityId(item) : undefined;
                })
                .filter((id): id is number => {
                    // Filter out undefined, drop zone ID, and root ID
                    return id !== undefined && id !== constants.workspace.dropZone.entityId && id !== constants.workspace.root.entityId;
                });

            // ---- VS CODE BEHAVIOR: Filter out descendants of selected nodes ----
            selectedEntityIds = selectedEntityIds.filter((entityId) => {
                const isDescendantOfOtherSelected = selectedEntityIds.some((otherEntityId) => {
                    if (otherEntityId === entityId) return false;
                    return treeMiniHelper.isDescendant(entityId, otherEntityId, treeData);
                });
                return !isDescendantOfOtherSelected;
            });

            if (selectedEntityIds.length === 0) {
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
            // OUTPUT: targetParentWorkspaceItemId = parent's workspace_items.id or undefined for root
            let targetParentWorkspaceItemId: number | undefined = undefined;

            if (!args.parentId) {
                // ---- Case 1: Drop at root level (bottom of tree) ----
                targetParentWorkspaceItemId = undefined;
                console.log("🎯 Drop target: Root level (parentId is null)");
            } else {
                const targetParentTreeNode = validTreeNodes.find((t) => t.id === args.parentId);

                if (!targetParentTreeNode) {
                    // ---- Check if it's the drop zone node ----
                    const dropZoneNode = allTreeNodes.find((t) => t.id === args.parentId);
                    if (dropZoneNode && getEntityId(dropZoneNode) === constants.workspace.dropZone.entityId) {
                        targetParentWorkspaceItemId = undefined;
                        console.log("🎯 Drop target: Root level (drop zone)");

                        // ---- VALIDATION: If all items already root-level, prevent drop ----
                        const allAlreadyRoot = selectedEntityIds.every((id) => {
                            const item = validTreeNodes.find((t) => getEntityId(t) === id);
                            return !item?.data.parentId || item.data.parentId === null;
                        });
                        if (allAlreadyRoot) {
                            console.warn("⚠️ All items are already at root level");
                            setIsDragging(false);
                            return;
                        }
                    } else {
                        // ---- Parent node not found - treat as root level drop ----
                        targetParentWorkspaceItemId = undefined;
                        console.log("🎯 Drop target: Root level (parentNode not found)");
                    }
                } else {
                    const targetWorkspaceItemId = targetParentTreeNode.data.id; // workspace_items.id

                    // ---- Negative IDs are workspace root nodes or drop zone ----
                    if (targetWorkspaceItemId < 0) {
                        targetParentWorkspaceItemId = undefined; // Move to workspace root
                        console.log("🎯 Drop target: Root level (negative entity ID)");
                    } else {
                        const targetNodeData = targetParentTreeNode.data;

                        // ---- VALIDATION: Check if all items already have this parent ----
                        const allSameParent = selectedEntityIds.every((id: number) => {
                            const item = validTreeNodes.find((t) => getEntityId(t) === id);
                            if (!item) return false;
                            const currentParentId = "parentId" in item.data ? item.data.parentId : undefined;
                            return currentParentId === targetWorkspaceItemId;
                        });

                        if (allSameParent) {
                            console.warn("⚠️ All items already have this parent - no change needed");
                            setIsDragging(false);
                            return;
                        }

                        // ---- Check if this is a folder (V2: entityType === 2) ----
                        const isFolder = "entityType" in targetNodeData && targetNodeData.entityType === 2;

                        if (isFolder) {
                            // ---- Dropping INTO a folder ----
                            targetParentWorkspaceItemId = targetWorkspaceItemId;
                            console.log(`🎯 Drop target: Folder ${targetWorkspaceItemId}`);
                        } else {
                            // ---- Dropping BETWEEN siblings - use their parent ----
                            targetParentWorkspaceItemId = targetNodeData.parentId ?? undefined;
                            console.log(`🎯 Drop target: ${targetParentWorkspaceItemId === undefined ? "Root level" : `Parent ${targetParentWorkspaceItemId}`} (between siblings)`);
                        }
                    }
                }
            }

            // -------------------------------------------------------
            // STEP 3: VALIDATION - PREVENT INVALID MOVES
            // -------------------------------------------------------
            const hasWorkspaceRoot = selectedEntityIds.some((id) => id === constants.workspace.root.entityId);
            if (hasWorkspaceRoot) {
                console.warn("⚠️ Cannot move workspace root node");
                setIsDragging(false);
                return;
            }
            if (selectedEntityIds.some((id) => id < 0)) {
                console.warn("⚠️ Cannot move items with invalid IDs");
                setIsDragging(false);
                return;
            }

            if (targetParentWorkspaceItemId !== undefined && selectedEntityIds.includes(targetParentWorkspaceItemId)) {
                console.warn("⚠️ Cannot move items into one of the selected items");
                setIsDragging(false);
                return;
            }

            if (targetParentWorkspaceItemId !== undefined) {
                const isTargetDescendantOfSelected = selectedEntityIds.some((draggedId) => {
                    return treeMiniHelper.isDescendant(targetParentWorkspaceItemId!, draggedId, treeData);
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
            const targetParentNode = targetParentWorkspaceItemId !== undefined ? treeMiniHelper.$traverse(treeData).find((t) => t.data.id === targetParentWorkspaceItemId) : null;

            // ---- Filter out workspace root and drop zone ----
            const targetSiblings = targetParentNode
                ? targetParentNode.children || []
                : treeData.filter((t) => {
                      const entityId = getEntityId(t);
                      return entityId > 0 && entityId !== constants.workspace.dropZone.entityId;
                  });

            // ---- VALIDATION: Check same parent - different logic for single vs multi-select ----
            if (selectedEntityIds.length === 1) {
                // ---- Single select: If parent is target, no move needed ----
                const draggedItemId = selectedEntityIds[0];
                const draggedItem = validTreeNodes.find((t) => getEntityId(t) === draggedItemId);

                if (draggedItem) {
                    const currentParentId = "parentId" in draggedItem.data ? draggedItem.data.parentId : undefined;
                    const normalizedCurrentParent = currentParentId ?? null;
                    const normalizedTargetParent = targetParentWorkspaceItemId ?? null;

                    if (normalizedCurrentParent === normalizedTargetParent) {
                        console.warn("⚠️ Item already has this parent - no move needed");
                        setIsDragging(false);
                        return;
                    }
                }
            } else {
                // ---- Multi-select: Remove items that already have target parent ----
                const itemsToMove = selectedEntityIds.filter((id) => {
                    const item = validTreeNodes.find((t) => getEntityId(t) === id);
                    if (!item) return false;

                    const currentParentId = "parentId" in item.data ? item.data.parentId : undefined;
                    const normalizedCurrentParent = currentParentId ?? null;
                    const normalizedTargetParent = targetParentWorkspaceItemId ?? null;

                    // Keep items that don't have target parent
                    return normalizedCurrentParent !== normalizedTargetParent;
                });

                // If all items already have target parent, no move needed
                if (itemsToMove.length === 0) {
                    console.warn("⚠️ All items already have target parent - no move needed");
                    setIsDragging(false);
                    return;
                }

                // Update selectedEntityIds to only include items that need to move
                selectedEntityIds = itemsToMove;
            }

            if (args.index >= 0 && args.index <= targetSiblings.length) {
                const itemBefore = args.index > 0 ? targetSiblings[args.index - 1] : null;
                const itemAfter = args.index < targetSiblings.length ? targetSiblings[args.index] : null;

                const itemBeforeId = itemBefore ? getEntityId(itemBefore) : null;
                const itemAfterId = itemAfter ? getEntityId(itemAfter) : null;

                const bothInSelection = itemBeforeId && selectedEntityIds.includes(itemBeforeId) && itemAfterId && selectedEntityIds.includes(itemAfterId);

                const hasSiblingsInSelection = targetSiblings.some((sibling) => {
                    const siblingEntityId = getEntityId(sibling);
                    return selectedEntityIds.includes(siblingEntityId);
                });

                if (
                    bothInSelection ||
                    (hasSiblingsInSelection && ((itemBeforeId && selectedEntityIds.includes(itemBeforeId)) || (itemAfterId && selectedEntityIds.includes(itemAfterId))))
                ) {
                    console.warn("⚠️ Cannot drop between items in the same selection");
                    setIsDragging(false);
                    return;
                }
            }

            // -------------------------------------------------------
            // STEP 5: BUILD MOVE REQUEST & CALL API
            // -------------------------------------------------------
            if (!currentWorkspace?.id) {
                console.error("❌ No workspace ID found");
                setIsDragging(false);
                return;
            }

            const workspaceId = currentWorkspace.id;

            // ---- Build batch MOVE request ----
            // For each selected entity, create a MOVE action with:
            // - action: WorkspaceItemAction.Move (explicit action enum)
            // - id: workspace_items.id (NOT entity ID!)
            // - parentId: new parent's workspace_items.id (SELF-REFERENCING) or null for root
            const batchRequests = selectedEntityIds.map((entityId) => {
                // Find tree node by ENTITY ID (entityId)
                const item = allTreeNodes.find((t) => getEntityId(t) === entityId);
                if (!item) {
                    throw new Error(`Item with entity ID ${entityId} not found in tree`);
                }

                const itemData = item.data;

                // Extract workspace_items.id (required for MOVE action)
                // V2 structure: itemData.id = workspace_items.id
                if (!("id" in itemData)) {
                    throw new Error(`Item ${entityId} missing workspace_items.id property`);
                }

                return {
                    action: WorkspaceItemAction.Move,
                    id: itemData.id, // ✅ workspace_items.id (NOT entity ID!)
                    parentId: targetParentWorkspaceItemId ?? null, // ✅ Parent's workspace_items.id
                };
            });

            try {
                const result = await workspaceService._upsertWorkspaceItems($user.userToken, workspaceId, batchRequests);
                if (!result.success) {
                    throw new Error("Move API returned unsuccessful response");
                }

                // Show success toast
                enqueueSnackbar(`Successfully moved ${batchRequests.length} item(s)`, { variant: "success" });
            } catch (error) {
                console.error(`❌ Failed to move items:`, error);

                // Show error toast with user-friendly message
                enqueueSnackbar("Failed to move items. Please try again.", { variant: "error" });

                throw error;
            }

            // -------------------------------------------------------
            // STEP 6: REFRESH TREE & RESTORE SELECTION
            // -------------------------------------------------------
            await loadTree();

            // VS Code behavior: Re-select the moved items after move completes
            setSelectedItemIds(selectedEntityIds);
            if (selectedEntityIds.length > 0) {
                setLastSelectedItemId(selectedEntityIds[selectedEntityIds.length - 1]);
            }
        } catch (error) {
            console.error("❌ Failed to move item(s):", error);

            // Show error toast to user
            enqueueSnackbar("An error occurred while moving items", { variant: "error" });
        } finally {
            setIsDragging(false);
        }
    };

    /**
     * Handle new folder action
     * Opens create dialog with selected folder as parent
     */
    const addNewFolder = (treeData: TreeFolder[]) => {
        const parentId = selectedItemIds.length > 0 ? selectedItemIds[0] : undefined;

        // Extract folders from treeData
        const folders = treeMiniHelper.$traverse(treeData).map((t) => t.data);
        const parentFolder = parentId ? treeMiniHelper.$findFolderById((folders || []) as unknown as Folder[], parentId) : undefined;

        openFolderDialog("create", constants.workspace.itemTypes.folder, null, parentFolder);
    };

    return {
        handleMove,
        addNewFolder,
    };
};
