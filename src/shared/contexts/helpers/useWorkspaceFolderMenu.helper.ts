/**
 * Workspace Folder Menu Helper Hook
 * Business logic for folder context menu operations
 * Extracted from useOrchestratorContextMenuHelper for folder-specific logic
 */

import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useFolderDialogHelper } from "@/hooks/workspace/useFolderDialog.helper";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { constants } from "@/utils/constants";
import type { ItemType } from "@/store/workspace/FolderDialog.store";
import { Folder } from "@/types/folder.types";
import { workspaceService } from "@/services/workspace.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { filterTopLevelParents, transformItemsToTreeData } from "@/hooks/workspace/tree.miniHelper";
import type { WorkspaceItem, UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { isFolder, WorkspaceItemAction } from "@/types/workspace.types";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";

// --------------------------------
// RECURSIVE HELPER FUNCTIONS
// --------------------------------

/**
 * Traverse tree and collect all visible tag IDs in order (for VS Code-like navigation)
 */
const $getAllVisibleTagIds = (items: any[]): number[] => {
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
 * Returns array of all tags in the subtree including the root tag
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
const $countChildren = (tag: any): number => {
    if (!tag.children || tag.children.length === 0) return 0;
    return tag.children.length + tag.children.reduce((sum: number, child: any) => sum + $countChildren(child), 0);
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

export const useWorkspaceFolderMenuHelper = () => {
    const { $user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { selectedFolderIds, setSelectedFolderIds, setLastSelectedFolderId, currentTree, setCurrentTree } = useWorkspaceStore();
    const { openFolderDialog } = useFolderDialogHelper();
    const { processTabAfterDelete } = useEditorTabHelper();

    const selectedCount = selectedFolderIds.length;
    const isMultipleSelected = selectedCount > 1;

    /**
     * Handle create item action (folder/note/file)
     */
    const createFolder = (itemType: ItemType, parentTag?: any) => {
        // ----------------
        // Close context menu and open create dialog
        // ----------------
        setIsContextMenuOpen(false);
        openFolderDialog("create", itemType, null, parentTag);
    };

    /**
     * Handle edit folder action
     */
    const editFolder = (itemData: any) => {
        // ----------------
        // Close context menu
        // ----------------
        setIsContextMenuOpen(false);

        // ----------------
        // Determine item type and open edit dialog
        // ----------------
        if (itemData) {
            const itemType: ItemType = itemData.type || constants.workspace.itemTypes.folder;
            openFolderDialog("edit", itemType, itemData, null);
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
            enqueueSnackbar("Cannot remove folder: missing folder information", { variant: "error" });
            return;
        }

        // ----------------
        // STEP 2: Find next item to select after deletion (VS Code behavior)
        // ----------------
        let nextFolderIdToSelect: number | null = null;
        if (currentTree?.items) {
            const allVisibleFolderIds = $getAllVisibleTagIds(currentTree.items);
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

            // Map items with proper type codes (2=folder, 3=note, 4=file)
            const deleteItems = foldersToDelete.map((f) => {
                const itemType = (f as any).type;
                let type: 2 | 3 | 4 = 2; // Default to folder

                if (itemType === constants.workspace.itemTypes.folder || itemType === constants.workspace.itemTypes.tag) {
                    type = 2;
                } else if (itemType === constants.workspace.itemTypes.note) {
                    type = 3;
                } else if (itemType === constants.workspace.itemTypes.file) {
                    type = 4;
                }

                return {
                    id: f.id!,
                    type,
                };
            });

            const result = await workspaceService._deleteWorkspaceItems(token || "", currentTree?.workspaceId || 1, {
                items: deleteItems,
                isHardDelete,
            });

            // ----------------
            // STEP 5: Update UI after successful deletion
            // ----------------
            if (result && result.success) {
                // Remove folders from tree
                if (currentTree) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentTree.items, idsToRemove);

                    setCurrentTree({
                        ...currentTree,
                        items: updatedItems,
                    });

                    // VS Code behavior: Select next item after deletion
                    if (nextFolderIdToSelect !== null) {
                        setSelectedFolderIds([nextFolderIdToSelect]);
                        setLastSelectedFolderId(nextFolderIdToSelect);
                    } else {
                        // Clear selection if no next item
                        setSelectedFolderIds([]);
                        setLastSelectedFolderId(null);
                    }
                }

                enqueueSnackbar(`✅ Folder${isMultipleSelected ? "s" : ""} ${isHardDelete ? "permanently " : ""}deleted successfully`, { variant: "success" });
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
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to delete folders: ${errorMessage}`, { variant: "error" });
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
        if (!currentTree?.items) {
            console.error("❌ Cannot delete: no tree data");
            return;
        }

        // ----------------
        // STEP 2: Find selected folders and filter out workspace root nodes
        // ----------------
        const selectedFolders: Folder[] = [];
        for (const folderId of selectedIds) {
            const folder = $findFolderById(currentTree.items, folderId);
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
        const allVisibleFolderIds = $getAllVisibleTagIds(currentTree.items);

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

            // Map items with proper type codes (2=folder, 3=note, 4=file)
            const deleteItems = foldersToDelete.map((f) => {
                const itemType = (f as any).type;
                let type: 2 | 3 | 4 = 2;

                if (itemType === constants.workspace.itemTypes.folder || itemType === constants.workspace.itemTypes.tag) {
                    type = 2;
                } else if (itemType === constants.workspace.itemTypes.note) {
                    type = 3;
                } else if (itemType === constants.workspace.itemTypes.file) {
                    type = 4;
                }

                return {
                    id: f.id!,
                    type,
                };
            });

            const result = await workspaceService._deleteWorkspaceItems(token || "", currentTree?.workspaceId || 1, {
                items: deleteItems,
                isHardDelete,
            });

            // ----------------
            // STEP 6: Update UI after successful deletion
            // ----------------
            if (result && result.message === "Items deleted successfully") {
                // Remove folders from tree
                if (currentTree) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentTree.items, idsToRemove);

                    setCurrentTree({
                        ...currentTree,
                        items: updatedItems,
                    });

                    // VS Code behavior: Select next item after deletion
                    if (nextFolderIdToSelect !== null) {
                        setSelectedFolderIds([nextFolderIdToSelect]);
                        setLastSelectedFolderId(nextFolderIdToSelect);
                    } else {
                        setSelectedFolderIds([]);
                        setLastSelectedFolderId(null);
                    }
                }

                enqueueSnackbar(`✅ Folder${isMultipleSelected ? "s" : ""} ${isHardDelete ? "permanently " : ""}deleted successfully`, { variant: "success" });
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
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to delete folders: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    /**
     * Wrapper fo   r delete with confirmation popover
     */
    const dhr_items = (event: any, isHardDelete: boolean = false) => {
        // ----------------
        // STEP 1: Validate context data and workspace root check
        // ----------------
        if (!contextData) return;

        // Check if this is a workspace root node (negative ID)
        if (contextData.tagId < 0) {
            console.warn("⚠️ Cannot delete workspace root node");
            setIsContextMenuOpen(false);
            return;
        }

        setIsContextMenuOpen(false);

        // ----------------
        // STEP 2: Extract anchor element for popover positioning
        // ----------------
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        // ----------------
        // STEP 3: Build confirmation message based on delete type and selection
        // ----------------
        let message: string;

        if (isHardDelete) {
            // Hard delete warning messages
            if (isMultipleSelected) {
                message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${selectedCount} selected folders and ALL their contents (notes, files, subfolders).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
            } else {
                const childCount = $countChildren(contextData);
                message =
                    childCount > 0
                        ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}" and ${childCount} child folder(s) with ALL their contents.\n\n❌ This action CANNOT be undone.\n❌ All notes, files, and subfolders will be LOST FOREVER.`
                        : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}" and ALL its contents.\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
            }
        } else {
            // Soft delete messages
            if (isMultipleSelected) {
                message = `Are you sure you want to delete ${selectedCount} selected folders?\n\nThis action cannot be undone.`;
            } else {
                const childCount = $countChildren(contextData);
                message =
                    childCount > 0
                        ? `Are you sure you want to delete "${contextData.name}"?\n\nThis will also delete ${childCount} child folder(s).`
                        : `Are you sure you want to delete "${contextData.name}"?`;
            }
        }

        // ----------------
        // STEP 4: Show confirmation popover and handle user response
        // ----------------
        showConfirmation({
            anchorEl: anchorElement,
            message,
            confirmText: isHardDelete ? "Delete Permanently" : "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => {
                if (isHardDelete) {
                    // Hard delete - use old API (TODO: implement batch hard delete later)
                    if (isMultipleSelected) {
                        __bulkDeleteFolders(selectedFolderIds, isHardDelete);
                    } else {
                        __deleteItems(contextData, isHardDelete);
                    }
                } else {
                    // Soft delete/restore - use NEW batch API
                    // Determine operation type based on current deletedAt status
                    const isCurrentlyDeleted = contextData.deletedAt !== null && contextData.deletedAt !== undefined;
                    const operationType: "soft-delete" | "restore" = isCurrentlyDeleted ? "restore" : "soft-delete";

                    // Call new batch API
                    __deleteRestore_SelectedItems(undefined, operationType);
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
        const selectedIds = ids ?? selectedFolderIds;
        if (selectedIds.length === 0) {
            console.warn("⚠️ No items selected");
            return;
        }

        // ===== STEP 2: Validate tree data =====
        if (!currentTree?.items) {
            console.error("❌ Cannot delete: no tree data");
            return;
        }

        try {
            const token = $user.userToken;

            // ===== STEP 3: Filter to top-level parents only =====
            const treeData = transformItemsToTreeData(currentTree.items);
            const topLevelIds = filterTopLevelParents(selectedIds, treeData);

            console.log(`🔍 Filtered ${selectedIds.length} selected to ${topLevelIds.length} top-level parents`);

            if (topLevelIds.length === 0) {
                console.warn("⚠️ No valid items after filtering");
                return;
            }

            // ===== STEP 4: Find items and skip workspace root =====
            const selectedItems: WorkspaceItem[] = [];
            for (const itemId of topLevelIds) {
                const item = $findItemById(currentTree.items, itemId);
                if (item && item.id > 0) {
                    // Skip workspace root (negative ID)
                    selectedItems.push(item);
                }
            }

            if (selectedItems.length === 0) {
                console.warn("⚠️ No valid items to process");
                return;
            }

            // ===== STEP 5: Collect all descendants (giống __deleteRestore_SelectedNotes) =====
            const allItemsToUpdate: WorkspaceItem[] = [];
            for (const item of selectedItems) {
                const descendants = $collectAllDescendants_WorkspaceItems(item);
                allItemsToUpdate.push(...descendants);
            }

            // Remove duplicates
            const uniqueItemsMap = new Map<number, WorkspaceItem>();
            for (const item of allItemsToUpdate) {
                uniqueItemsMap.set(item.id, item);
            }
            const itemsToUpdate = Array.from(uniqueItemsMap.values());

            console.log(`📦 Collected ${itemsToUpdate.length} total items (including descendants)`);

            // -------------------------------------------------------
            // STEP 7: BUILD BATCH DELETE/RESTORE REQUESTS
            // -------------------------------------------------------
            // For each item (including descendants), create a DELETE or RESTORE action
            // - action: WorkspaceItemAction.Delete or WorkspaceItemAction.Restore
            // - id: workspace_items.id (V2: item.id = workspace_items.id)
            const batchRequests: UpsertWorkspaceItemRequest[] = itemsToUpdate.map((item) => {
                return {
                    action: type === "soft-delete" ? WorkspaceItemAction.Delete : WorkspaceItemAction.Restore,
                    id: item.id, // ✅ workspace_items.id
                };
            });

            // ===== STEP 8: Call batch upsert API (giống __deleteRestore_SelectedNotes) =====
            const result = await workspaceService._upsertWorkspaceItems(token ?? "", currentTree.workspaceId, batchRequests);

            if (!result.success) {
                throw new Error(result.message || "Batch update failed");
            }

            // ===== STEP 9: Post-processing (giống __deleteRestore_SelectedNotes) =====

            if (type === "soft-delete") {
                // Clean up open tabs (giống __deleteRestore_SelectedNotes)
                const folderIds = itemsToUpdate.filter((item) => item.type === constants.workspace.itemTypes.folder).map((item) => item.id);
                const noteIds = itemsToUpdate.filter((item) => item.type === constants.workspace.itemTypes.note).map((item) => item.id);
                const fileIds = itemsToUpdate.filter((item) => item.type === constants.workspace.itemTypes.file).map((item) => item.id);

                if (folderIds.length > 0) {
                    processTabAfterDelete(folderIds, "folder");
                }
                if (noteIds.length > 0) {
                    processTabAfterDelete(noteIds, "note");
                }
                if (fileIds.length > 0) {
                    processTabAfterDelete(fileIds, "file");
                }
            }

            // Reload workspace tree (giống __deleteRestore_SelectedNotes: await loadNotes())
            const updatedTree = await workspaceService._getWorkspaceTree(token ?? "", currentTree.workspaceId);
            setCurrentTree(updatedTree);

            // ===== STEP 10: Clear selection (giống __deleteRestore_SelectedNotes) =====
            setSelectedFolderIds([]);
            setLastSelectedFolderId(null);

            // Show success message
            enqueueSnackbar(`Successfully ${type === "soft-delete" ? "deleted" : "restored"} ${itemsToUpdate.length} item(s)`, { variant: "success" });
        } catch (error) {
            console.error("❌ Failed to update items:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to update items: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    /**
     * Helper: Recursively collect all descendants for workspace items
     */
    const $collectAllDescendants_WorkspaceItems = (item: WorkspaceItem): WorkspaceItem[] => {
        const descendants: WorkspaceItem[] = [item];
        if (isFolder(item) && item.children?.length > 0) {
            for (const child of item.children) {
                descendants.push(...$collectAllDescendants_WorkspaceItems(child));
            }
        }
        return descendants;
    };

    /**
     * Helper: Find item by ID recursively in workspace tree
     */
    const $findItemById = (items: WorkspaceItem[], targetId: number): WorkspaceItem | null => {
        for (const item of items) {
            if (item.id === targetId) return item;
            if (isFolder(item) && item.children?.length > 0) {
                const found = $findItemById(item.children, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    return {
        createFolder,
        editFolder,
        dhr_items,
    };
};
