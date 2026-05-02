/**
 * Workspace Folder Menu Helper Hook
 * Business logic for folder context menu operations
 * Extracted from useMenuContextHelper for folder-specific logic
 */

import {useKStore} from "../../store/K.store";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import {KService} from "../../service/K.service";
import {KItemV2} from "../../types/K-v2.types";
import {KUpsertWorkspaceItemRequest, KItemAction} from "../../types/K.types";
import {KDTO} from "../../types/K-dto.types";
import {kconstants} from "../../utils/K.Constants";
import {NodeItemType} from "../../store/KNodeDialog.store";
import { useEditorTabBarHelper} from "@/shell";
import {isUnauthorizedError, parseApiError, useAuthStore, useConfirmationPopoverHelper, useConsoleHelper, useMenuContext, useMenuContextHelper} from "@/shared";
import { getKConfirmMessage } from "../../utils/confirmMessage";
import {KtreeMiniHelper} from "../../hooks/kTree/Ktree.miniHelper";
import {useKNodeDialogHelper} from "../../hooks/useKNodeDialog.helper";
import {Folder} from "../../types/folder.types";

// --------------------------------
// RECURSIVE HELPER FUNCTIONS
// --------------------------------

/**
 * Traverse tree and collect all visible folder IDs in order (for VS Code-like navigation)
 */
const $getAllVisibleNodeIds = (items: any[]): number[] => {
    const result: number[] = [];

    function $traverse(nodes: any[]) {
        for (const node of nodes) {
            const nodeId = node.id;
            if (nodeId) {
                result.push(nodeId);
            }
            if (node.children && node.children.length > 0) {
                $traverse(node.children);
            }
        }
    }

    $traverse(items);
    return result;
};

/**
 * Recursively collect all descendant tags (children, grandchildren, etc.)
 * Returns array of all tags in the subtree including the root 
 */
const $collectAllDescendants = (folder: Folder): Folder[] => {
    const descendants: Folder[] = [folder];

    if (folder.children && folder.children.length > 0) {
        for (const child of folder.children) {
            descendants.push(...$collectAllDescendants(child));
        }
    }

    return descendants;
};

/**
 * Find folder by ID in tree structure
 */
const $findFolderById = (items: any[], folderId: number): Folder | null => {
    for (const item of items) {
        const nodeId = item.id;
        if (nodeId === folderId) {
            return item;
        }
        if (item.children?.length > 0) {
            const found = $findFolderById(item.children, folderId);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Count total children recursively
 */
const $countChildren = (folder: any): number => {
    if (!folder.children || folder.children.length === 0) return 0;
    return folder.children.length + folder.children.reduce((sum: number, child: any) => sum + $countChildren(child), 0);
};
    
/**
 * Recursively remove items by IDs from tree
 */
const $removeItems = (items: any[], idsToRemove: Set<number>): any[] => {
    return items
        .filter((item) => !idsToRemove.has(item.id))
        .map((item) => ({
            ...item,
            children: item.children ? $removeItems(item.children, idsToRemove) : [],
        }));
};

export const useKMenuHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentK, setCurrentK } = useKStore();
    const { openNodeDialog } = useKNodeDialogHelper();
    const { processTabAfterDelete, openTab } = useEditorTabBarHelper();

    const selectedCount = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;



    /**
     * Handle create item action (folder/note/file)
     */
    const createFolder = (itemType: NodeItemType, parentTag?: any) => {
        // ----------------
        // Close context menu and open create dialog
        // ----------------
        setIsMenuContextOpen(false);
        openNodeDialog("create", itemType, null, parentTag);
    };

    /**
     * Handle edit folder action
     */
    const editFolder = (itemData: any) => {
        // ----------------
        // Close context menu
        // ----------------
        setIsMenuContextOpen(false);

        // ----------------
        // Determine item type and open edit dialog
        // ----------------
        if (itemData) {
            const itemType: NodeItemType = itemData.type || workspaceConstants.itemTypes.folder;
            openNodeDialog("edit", itemType, itemData, null);
        }
    };

    /**
     * Handle delete single folder
     */
    const __deleteItems = async (folder: Folder, isHardDelete: boolean = false) => {
        // ----------------
        // STEP 1: Validate folder ID
        // ----------------
        if (!folder.id) {
            console.error("❌ Cannot remove folder: missing folder ID");
            _console.error("Cannot remove folder: missing folder information");
            return;
        }

        // ----------------
        // STEP 2: Find next item to select after deletion (VS Code behavior)
        // ----------------
        let nextFolderIdToSelect: number | null = null;
        if (currentK?.flatData) {
            const allVisibleFolderIds = $getAllVisibleNodeIds(currentK.flatData);
            const currentIndex = allVisibleFolderIds.indexOf(folder.id);

            if (currentIndex !== -1) {
                // Try to select the next item (below)
                if (currentIndex < allVisibleFolderIds.length - 1) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex + 1];
                }
                // If it's the last item, select the previous one (above)
                else if (currentIndex > 0) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex - 1];
                }
            }
        }

        // ----------------
        // STEP 3: Collect all descendants for cascade deletion
        // ----------------
        const allFolders = $collectAllDescendants(folder);

        const foldersToDelete = allFolders.filter((f) => {
            if (!f.id) {
                console.warn(`⚠️ Skipping folder without ID: ${f.name}`);
                return false;
            }
            return true;
        });

        // ----------------
        // STEP 4: Delete items via API
        // ----------------
        try {
            const token = $user.userToken;

            const result = await KService._deleteWorkspaceItems(token || "", currentK?.id || 1, {
                nodeIds: foldersToDelete.map((f) => f.id!),
            });
            // ----------------
            if (result && result.success) {
                // Remove folders from tree
                if (currentK) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentK.flatData, idsToRemove);

                    setCurrentK({
                        ...currentK,
                        flatData: updatedItems,
                    });

                    // VS Code behavior: Select next item after deletion
                    if (nextFolderIdToSelect !== null) {
                        setSelectedItemIds([nextFolderIdToSelect]);
                        setLastSelectedItemId(nextFolderIdToSelect);
                    } else {
                        // Clear selection if no next item
                        setSelectedItemIds([]);
                        setLastSelectedItemId(null);
                    }
                }

                _console.success(`✅ Folder${isMultipleSelected ? "s" : ""} ${isHardDelete ? "permanently " : ""}deleted successfully`);
            } else {
                throw new Error("Failed to delete folders");
            }
        } catch (error) {
            // ----------------
            // STEP 6: Handle errors
            // ----------------
            console.error("❌ Failed to delete folders:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to delete folders: ${errorMessage}`);
            }
        }
    };

    /**
     * Handle bulk delete for multiple selected folders
     */
    const __bulkDeleteFolders = async (selectedIds: number[], isHardDelete: boolean = false) => {
        // ----------------
        // STEP 1: Validate tree data
        // ----------------
        if (!currentK?.flatData) {
            console.error("❌ Cannot delete: no tree data");
            return;
        }

        // ----------------
        // STEP 2: Find selected folders and filter out workspace root nodes
        // ----------------
        const selectedFolders: Folder[] = [];
        for (const folderId of selectedIds) {
            const folder = $findFolderById(currentK.flatData, folderId);
            if (folder) {
                // Check if this is a workspace root node (negative ID)
                if (folder.id < 0) {
                    console.warn("⚠️ Skipping workspace root node:", folder.id);
                    continue;
                }
                selectedFolders.push(folder);
            }
        }

        if (selectedFolders.length === 0) {
            console.warn("⚠️ No valid folders to delete");
            return;
        }

        // ----------------
        // STEP 3: Find next item to select after deletion (VS Code behavior)
        // ----------------
        let nextFolderIdToSelect: number | null = null;
        const allVisibleFolderIds = $getAllVisibleNodeIds(currentK.flatData);

        // Find the highest index among selected folders
        const selectedIndices = selectedIds
            .map((id) => allVisibleFolderIds.indexOf(id))
            .filter((idx) => idx !== -1)
            .sort((a, b) => b - a); // Sort descending

        if (selectedIndices.length > 0) {
            const lastSelectedIndex = selectedIndices[0];

            // Try to select the next item after the last selected item
            if (lastSelectedIndex < allVisibleFolderIds.length - 1) {
                nextFolderIdToSelect = allVisibleFolderIds[lastSelectedIndex + 1];
            }
            // If it's the last item, select the previous one before the first selected
            else if (selectedIndices[selectedIndices.length - 1] > 0) {
                nextFolderIdToSelect = allVisibleFolderIds[selectedIndices[selectedIndices.length - 1] - 1];
            }
        }

        // ----------------
        // STEP 4: Collect all descendants and remove duplicates
        // ----------------
        const allFoldersToDelete: Folder[] = [];
        for (const folder of selectedFolders) {
            const descendants = $collectAllDescendants(folder);
            allFoldersToDelete.push(...descendants);
        }

        // Remove duplicates (in case of nested selections)
        const uniqueFoldersMap = new Map<number, Folder>();
        for (const folder of allFoldersToDelete) {
            if (folder.id) {
                uniqueFoldersMap.set(folder.id, folder);
            }
        }
        const foldersToDelete = Array.from(uniqueFoldersMap.values());

        // ----------------
        // STEP 5: Execute bulk delete via API
        // ----------------
        try {
            const token = $user.userToken;

            const result = await KService._deleteWorkspaceItems(token || "", currentK?.id || 1, {
                nodeIds: foldersToDelete.map((f) => f.id!),
            });

            // ----------------
            // STEP 6: Update UI after successful deletion
            // ----------------
            if (result && result.message === "Items deleted successfully") {
                // Remove folders from tree
                if (currentK) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentK.flatData, idsToRemove);

                    setCurrentK({
                        ...currentK,
                        flatData: updatedItems,
                    });

                    // VS Code behavior: Select next item after deletion
                    if (nextFolderIdToSelect !== null) {
                        setSelectedItemIds([nextFolderIdToSelect]);
                        setLastSelectedItemId(nextFolderIdToSelect);
                    } else {
                        setSelectedItemIds([]);
                        setLastSelectedItemId(null);
                    }
                }

                _console.success(`Folder${isMultipleSelected ? "s" : ""} ${isHardDelete ? "permanently " : ""}deleted successfully`);
            } else {
                throw new Error("Failed to bulk delete folders");
            }
        } catch (error) {
            // ----------------
            // STEP 7: Handle errors
            // ----------------
            console.error("❌ Failed to bulk delete folders:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to delete folders: ${errorMessage}`);
            }
        }
    };

    

    /**
     * DELETE / HARD DELETE / RESTORE
     */
    const dhr_items = (event: any, isHardDelete: boolean = false) => {
        // ----------------
        // STEP 1: Validate context data and workspace root check
        // ----------------
        if (!contextData) return;

        // Check if this is a workspace root node (negative ID)
        if (contextData.tagId < 0) {
            console.warn("⚠️ Cannot delete workspace root node");
            setIsMenuContextOpen(false);
            return;
        }

        setIsMenuContextOpen(false);

        // ----------------
        // STEP 2: Extract anchor element for popover positioning
        // ----------------
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        // ----------------
        // STEP 3: Build confirmation message based on delete type and selection
        // ----------------
        const isCurrentlyDeleted = !isHardDelete && contextData.deletedAt != null;
        const childCount = isMultipleSelected ? 0 : $countChildren(contextData);
        const entityName = isMultipleSelected ? undefined : contextData.name;

        let title: string;
        let subtitle: string;
        let confirmText: string;
        let confirmColor: "destructive" | "default";

        if (isCurrentlyDeleted) {
            title = `Restore "${entityName || "item"}"?`;
            subtitle = "This item will be restored and visible again.";
            confirmText = "Restore";
            confirmColor = "default";
        } else {
            const confirmMsg = getKConfirmMessage({
                type: isHardDelete ? "hard-delete" : "soft-delete",
                entityType: "folder",
                count: selectedCount,
                isMultiple: isMultipleSelected,
                entityName,
                childCount
            });
            title = confirmMsg.title;
            subtitle = confirmMsg.subtitle ?? '';
            confirmText = isHardDelete ? "Delete Permanently" : "Delete";
            confirmColor = "destructive";
        }

        // ----------------
        // STEP 4: Show confirmation popover and handle user response
        // ----------------
        showConfirmation({
            anchorEl: anchorElement,
            title,
            subtitle,
            confirmText,
            cancelText: "Cancel",
            confirmColor,
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => {
                if (isHardDelete) {
                    // Hard delete - use old API (TODO: implement batch hard delete later)
                    if (isMultipleSelected) {
                        __bulkDeleteFolders(selectedItemIds, isHardDelete);
                    } else {
                        __deleteItems(contextData, isHardDelete);
                    }
                } else {
                    // Soft delete/restore - use NEW batch API
                    // Determine operation type based on current deletedAt status
                    const isCurrentlyDeleted = contextData.deletedAt !== null && contextData.deletedAt !== undefined;
                    const operationType: "soft-delete" | "restore" = isCurrentlyDeleted ? "restore" : "soft-delete";

                    // For single item, pass the specific item ID; for multiple, use selected IDs
                    const idsToProcess = isMultipleSelected ? selectedItemIds : [contextData.id];
                    __deleteRestore_SelectedItems(idsToProcess, operationType);
                }
            },
        });
    };

    /**
     * Delete/Restore selected workspace items using batch upsert API
     * Follows __deleteRestore_SelectedNotes pattern from useNoteGrid.helper.ts
     * Pattern: 100% follows NotesController batch pattern
     */
    const __deleteRestore_SelectedItems = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        // ===== STEP 1: Get selected items (giống __deleteRestore_SelectedNotes) =====
        const selectedIds = ids ?? selectedItemIds;
        if (selectedIds.length === 0) {
            console.warn("⚠️ No items selected");
            return;
        }

        // ===== STEP 2: Validate tree data =====
        if (!currentK?.flatData) {
            console.error("❌ Cannot delete: no tree data");
            return;
        }

        try {
            const token = $user.userToken;

            // ===== STEP 3: Filter to top-level parents only =====
            const treeData = KtreeMiniHelper.buildTreeFromV2Items(currentK.flatData);
            const topLevelIds = KtreeMiniHelper.filterTopLevelParents(selectedIds, treeData);

            if (topLevelIds.length === 0) {
                console.warn("⚠️ No valid items after filtering");
                return;
            }

            // ===== STEP 4: Find items and skip workspace root =====
            const selectedItems: KItemV2[] = [];
            for (const itemId of topLevelIds) {
                const item = $findItemById(currentK.flatData, itemId);
                if (item && item.id > 0) {
                    // Skip workspace root (negative ID)
                    selectedItems.push(item);
                }
            }

            if (selectedItems.length === 0) {
                console.warn("⚠️ No valid items to process");
                return;
            }

            // ===== STEP 5: Only process selected items, no descendants =====
            // Both DELETE and RESTORE: Only selected items, no cascade
            // Backend will handle cascade delete if needed via database constraints
            const allItemsToUpdate: KItemV2[] = [...selectedItems];

            // Remove duplicates
            const uniqueItemsMap = new Map<number, KItemV2>();
            for (const item of allItemsToUpdate) {
                uniqueItemsMap.set(item.id, item);
            }
            const itemsToUpdate = Array.from(uniqueItemsMap.values());

            // -------------------------------------------------------
            // STEP 7: BUILD BATCH DELETE/RESTORE REQUESTS
            // -------------------------------------------------------
            // For each selected item, create a DELETE or RESTORE action
            // - action: WorkspaceItemAction.Delete or WorkspaceItemAction.Restore
            // - id: workspace_items.id (V2: item.id = workspace_items.id)
            const batchRequests: KUpsertWorkspaceItemRequest[] = itemsToUpdate.map((item) => {
                return {
                    action: type === "soft-delete" ? KItemAction.Delete : KItemAction.Restore,
                    id: item.id, // ✅ workspace_items.id
                };
            });

            // ===== STEP 8: Call batch upsert API (giống __deleteRestore_SelectedNotes) =====
            const result = await KService._upsertWorkspaceItems(token ?? "", currentK.id, batchRequests);

            if (!result.success) {
                throw new Error(result.message || "Batch update failed");
            }

            // ===== STEP 9: Post-processing (giống __deleteRestore_SelectedNotes) =====

            if (type === "soft-delete") {
                // All items are nodes — close their tabs
                const nodeIds = itemsToUpdate.map((item) => item.id);

                if (nodeIds.length > 0) {
                    processTabAfterDelete(nodeIds, "node");
                }
            }

            // Reload workspace tree (giống __deleteRestore_SelectedNotes: await loadNotes())
            const res = await KService._getWorkspaceTreeV2(token ?? "", currentK.id);
            if(res && res.success){
                setCurrentK(res.object as KDTO);
                // ===== STEP 10: Clear selection (giống __deleteRestore_SelectedNotes) =====
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
    
                // Show success message
                _console.success(`Successfully ${type === "soft-delete" ? "deleted" : "restored"} ${itemsToUpdate.length} item(s)`);
            }
            else {
                throw new Error("Failed to reload workspace tree");
            }

        } catch (error) {
            console.error("❌ Failed to update items:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to update items: ${errorMessage}`);
            }
        }
    };

    /**
     * Helper: Recursively collect all descendants for workspace items
     */
    const $collectAllDescendants_WorkspaceItems = (item: KItemV2): KItemV2[] => {
        const descendants: KItemV2[] = [item];

        // With V2 flat structure, find all descendants by traversing parentId relationships
        const findDescendants = (parentId: number) => {
            const children = currentK?.flatData.filter(i => i.parentId === parentId) || [];
            for (const child of children) {
                descendants.push(child);
                // Recursively find descendants of this child
                findDescendants(child.id);
            }
        };

        findDescendants(item.id);
        return descendants;
    };

    /**
     * Helper: Find item by ID recursively in workspace tree
     */
    const $findItemById = (items: KItemV2[], targetId: number): KItemV2 | null => {
        // With V2 flat structure, we can just find directly
        return items.find(item => item.id === targetId) || null;
    };

    return {
        createFolder,
        editFolder,
        dhr_items
    };
};



