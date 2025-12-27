/**
 * Tree Operation Helper Hook
 * Handles tree operations: drag & drop, refresh, new folder
 */

import type { TreeFolder } from "./tree.miniHelper";
import { treeMiniHelper } from "./tree.miniHelper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useFolderDialogHelper } from "./useFolderDialog.helper";
import { useWorkspaceOperation } from "./useWorkspaceOperation.helper";
import { constants } from "@/utils/constants";
import { workspaceService } from "@/services/workspace.service";
import type { MoveItemsRequest } from "@/types/workspace.types";
import { Folder } from "@/types/index";
import { useSnackbar } from "notistack";
import { useAuthStore } from "@/store/auth/Auth.store";

export const useTreeHelper = () => {
    const { selectedFolderIds, setSelectedFolderIds, setLastSelectedFolderId, setIsDragging, currentTree, setCurrentTree } = useWorkspaceStore();

    const { openFolderDialog } = useFolderDialogHelper();
    const { loadTree } = useWorkspaceOperation();
    const { enqueueSnackbar } = useSnackbar();
    const { $user } = useAuthStore();

    /**
     * Handle drag and drop - SUPPORTS MULTI-ITEM DRAG (folders, notes, files)
     */
    const handleMove = async (args: { dragIds: string[]; parentId: string | null; index: number }, treeData: TreeFolder[]) => {
        try {
            console.log("🚀 handleMove called:", { dragIds: args.dragIds, parentId: args.parentId, index: args.index });
            
            setIsDragging(true);

            // =================================================================
            // STEP 1: EXTRACT ENTITY IDS FROM DRAGGED ITEMS
            // =================================================================
            const allTreeNodes = treeMiniHelper.$traverse(treeData);
            
            // ---- Filter out the drop zone node (drop zone node is a FAKE node with ID -1)---- 
            const validTreeNodes = allTreeNodes.filter(node => node.data.id !== -1);
            
            let selectedEntityIds = args.dragIds
                .map((dragId) => {
                    const item = validTreeNodes.find((t) => t.id === dragId);
                    return item?.data.id;
                })
                .filter((id): id is number => id !== undefined && id !== -1); // Filter out drop zone ID

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

            // =================================================================
            // STEP 2: EXTRACT TARGET PARENT ID
            // =================================================================
            // IMPORTANT: args.parentId can be:
            // 1. null (when dropping at root level - bottom of tree)
            // 2. A folder ID (when dropping INTO a folder)
            // 3. A note/file ID (when dropping BETWEEN siblings - use their parent instead)
            // 4. Drop zone ID (special ID -1 for root level drops)
            let targetParentEntityId: number | undefined = undefined;
            
            if (!args.parentId) {
                // ---- Case 1: Drop at root level (bottom of tree) ----
                targetParentEntityId = undefined;
                console.log("🎯 Drop target: Root level (parentId is null)");
            } else {
                const targetParentTreeNode = validTreeNodes.find((t) => t.id === args.parentId);
                
                if (!targetParentTreeNode) {
                    // ---- Check if it's the drop zone node ----
                    const dropZoneNode = allTreeNodes.find((t) => t.id === args.parentId);
                    if (dropZoneNode && dropZoneNode.data.id === -1) {
                        targetParentEntityId = undefined;
                        console.log("🎯 Drop target: Root level (drop zone)");
                        
                        // ---- VALIDATION: If all items already root-level, prevent drop ----
                        const allAlreadyRoot = selectedEntityIds.every(id => {
                            const item = validTreeNodes.find(t => t.data.id === id);
                            return !item?.data.parentId || item.data.parentId === null;
                        });
                        if (allAlreadyRoot) {
                            console.warn("⚠️ All items are already at root level");
                            setIsDragging(false);
                            return;
                        }
                    } else {
                        // ---- Parent node not found - treat as root level drop ----
                        targetParentEntityId = undefined;
                        console.log("🎯 Drop target: Root level (parentNode not found)");
                    }
                } else {
                    const targetEntityId = targetParentTreeNode.data.id;

                    // ---- Negative IDs are workspace root nodes or drop zone ----
                    if (targetEntityId < 0) {
                        targetParentEntityId = undefined; // Move to workspace root
                        console.log("🎯 Drop target: Root level (negative entity ID)");
                    } else {
                        const targetNodeData = targetParentTreeNode.data;

                        // ---- VALIDATION: Check if all items already have this parent ----
                        const allSameParent = selectedEntityIds.every((id: number) => {
                            const item = validTreeNodes.find((t) => t.data.id === id);
                            if (!item) return false;
                            const currentParentId = "parentId" in item.data ? item.data.parentId : undefined;
                            return currentParentId === targetEntityId;
                        });
                        
                        if (allSameParent) {
                            console.warn("⚠️ All items already have this parent - no change needed");
                            setIsDragging(false);
                            return;
                        }

                        // ---- Check if this is a folder or note/file ----
                        if ("type" in targetNodeData) {
                            if (targetNodeData.type === constants.workspace.itemTypes.folder) {
                                // ---- Dropping INTO a folder ----
                                targetParentEntityId = targetEntityId;
                                console.log(`🎯 Drop target: Folder ${targetEntityId}`);
                            } else {
                                // ---- Dropping BETWEEN siblings - use their parent ----
                                targetParentEntityId = targetNodeData.parentId ?? undefined;
                                console.log(`🎯 Drop target: ${targetParentEntityId === undefined ? 'Root level' : `Parent ${targetParentEntityId}`} (between siblings)`);
                            }
                        } else {
                            // ---- Fallback: assume folder ----
                            targetParentEntityId = targetEntityId;
                            console.log(`🎯 Drop target: Folder ${targetEntityId} (fallback)`);
                        }
                    }
                }
            }

            // =================================================================
            // STEP 3: VALIDATION - PREVENT INVALID MOVES
            // =================================================================
            const hasWorkspaceRoot = selectedEntityIds.some((id) => id === constants.workspace.rootId);
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

            if (targetParentEntityId !== undefined && selectedEntityIds.includes(targetParentEntityId)) {
                console.warn("⚠️ Cannot move items into one of the selected items");
                setIsDragging(false);
                return;
            }

            if (targetParentEntityId !== undefined) {
                const isTargetDescendantOfSelected = selectedEntityIds.some((draggedId) => {
                    return treeMiniHelper.isDescendant(targetParentEntityId!, draggedId, treeData);
                });

                if (isTargetDescendantOfSelected) {
                    console.warn("⚠️ Cannot move items into a descendant of selected items");
                    setIsDragging(false);
                    return;
                }
            }

            // =================================================================
            // STEP 4: VALIDATE DROP POSITION
            // =================================================================
            const targetParentNode = targetParentEntityId !== undefined ? treeMiniHelper.$traverse(treeData).find((t) => t.data.id === targetParentEntityId) : null;

            // ---- Filter out workspace root and drop zone ----
            const targetSiblings = targetParentNode ? targetParentNode.children || [] : treeData.filter((t) => t.data.id > 0 && t.data.id !== -1);

            // ---- VALIDATION: Check same parent - different logic for single vs multi-select ----
            if (selectedEntityIds.length === 1) {
                // ---- Single select: If parent is target, no move needed ----
                const draggedItemId = selectedEntityIds[0];
                const draggedItem = validTreeNodes.find(t => t.data.id === draggedItemId);
                
                if (draggedItem) {
                    const currentParentId = "parentId" in draggedItem.data ? draggedItem.data.parentId : undefined;
                    const normalizedCurrentParent = currentParentId ?? null;
                    const normalizedTargetParent = targetParentEntityId ?? null;
                    
                    if (normalizedCurrentParent === normalizedTargetParent) {
                        console.warn("⚠️ Item already has this parent - no move needed");
                        setIsDragging(false);
                        return;
                    }
                }
            } else {
                // ---- Multi-select: Remove items that already have target parent ----
                const itemsToMove = selectedEntityIds.filter(id => {
                    const item = validTreeNodes.find(t => t.data.id === id);
                    if (!item) return false;
                    
                    const currentParentId = "parentId" in item.data ? item.data.parentId : undefined;
                    const normalizedCurrentParent = currentParentId ?? null;
                    const normalizedTargetParent = targetParentEntityId ?? null;
                    
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

                const itemBeforeId = itemBefore?.data.id ?? null;
                const itemAfterId = itemAfter?.data.id ?? null;

                const bothInSelection = itemBeforeId && selectedEntityIds.includes(itemBeforeId) && itemAfterId && selectedEntityIds.includes(itemAfterId);

                const hasSiblingsInSelection = targetSiblings.some((sibling) => {
                    const siblingEntityId = sibling.data.id;
                    return selectedEntityIds.includes(siblingEntityId);
                });

                if (bothInSelection || (hasSiblingsInSelection && ((itemBeforeId && selectedEntityIds.includes(itemBeforeId)) || (itemAfterId && selectedEntityIds.includes(itemAfterId))))) {
                    console.warn("⚠️ Cannot drop between items in the same selection");
                    setIsDragging(false);
                    return;
                }
            }

    
            // STEP 5: BUILD MOVE REQUEST & CALL API
            // =================================================================
            if (!currentTree?.workspaceId) {
                console.error("❌ No workspace ID found");
                setIsDragging(false);
                return;
            }

            const workspaceId = currentTree.workspaceId;

            // ---- Build move request matching backend API format ----
            const moveRequest: MoveItemsRequest = {
                items: selectedEntityIds.map((entityId) => {
                    const item = allTreeNodes.find((t) => t.data.id === entityId);
                    if (!item) {
                        throw new Error(`Item with entity ID ${entityId} not found in tree`);
                    }

                    const itemData = item.data;

                    // Map WorkspaceItem type to backend type codes
                    let typeCode: 2 | 3 | 4;
                    if ("type" in itemData) {
                        if (itemData.type === constants.workspace.itemTypes.folder) {
                            typeCode = 2;
                        } else if (itemData.type === constants.workspace.itemTypes.note) {
                            typeCode = 3;
                        } else if (itemData.type === constants.workspace.itemTypes.file) {
                            typeCode = 4;
                        } else {
                            throw new Error(`Unknown item type: ${(itemData as any).type}`);
                        }
                    } else {
                        throw new Error(`Item ${entityId} missing type property`);
                    }

                    return {
                        type: typeCode,
                        id: entityId, // Use entity ID (folder/note/file ID)
                    };
                }),
                targetParentId: targetParentEntityId ?? null,
            };

            try {
                const result = await workspaceService._moveWorkspaceItems($user.userToken, workspaceId, moveRequest);
                if (!result.success) {
                    throw new Error("Move API returned unsuccessful response");
                }

                // Show success toast
                enqueueSnackbar(`Successfully moved ${moveRequest.items.length} item(s)`, { variant: "success" });
            } catch (error) {
                console.error(`❌ Failed to move items:`, error);

                // Show error toast with user-friendly message
                enqueueSnackbar("Failed to move items. Please try again.", { variant: "error" });

                throw error;
            }

            // =================================================================
            // STEP 6: REFRESH TREE & RESTORE SELECTION
            // =================================================================
            await loadTree(workspaceId);

            // VS Code behavior: Re-select the moved items after move completes
            setSelectedFolderIds(selectedEntityIds);
            if (selectedEntityIds.length > 0) {
                setLastSelectedFolderId(selectedEntityIds[selectedEntityIds.length - 1]);
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
        const parentId = selectedFolderIds.length > 0 ? selectedFolderIds[0] : undefined;

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
