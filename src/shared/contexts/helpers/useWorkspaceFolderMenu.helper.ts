/**
 * Workspace Folder Menu Helper Hook
 * Business logic for folder context menu operations
 * Extracted from useOrchestratorContextMenuHelper for folder-specific logic
 */

import React from "react";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useFolderDialogHelper } from "@/hooks/workspace/useFolderDialog.helper";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { constants } from "@/utils/constants";
import type { ItemType } from "@/store/workspace/FolderDialog.store";
import { Folder } from "@/types/folder.types";
import { workspaceService } from "@/services/workspace.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { filterTopLevelParents, transformItemsToTreeData, buildTreeFromV2Items, treeMiniHelper } from "@/hooks/workspace/tree.miniHelper";
import type { WorkspaceItem, UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { isFolder, WorkspaceItemAction } from "@/types/workspace.types";
import type { WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import {WorkspaceDTO} from "@/types/workspace-dto.types";
import { getConfirmMessage } from "@/utils/confirmation-message.utils";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useStandardRegistryStore } from "@/store/index";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { collectIdsFromTree, generateTempId, generateUnsavedName } from "@/utils/temp-id.utils";
import { Note } from "@/types/note.types";

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
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { openFolderDialog } = useFolderDialogHelper();
    const { processTabAfterDelete, openTab } = useEditorTabHelper();
    const { openTabs } = useEditorTabsStore();
    const { registries } = useStandardRegistryStore();
    const { setShouldFocusNoteName } = useNoteDetailStore();

    const selectedCount = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;


    /**
     * Create new note in workspace
     * Moved from WorkspaceFolderNodeMenu component
     */
    const createNewNote = (contextData: any) => {
        // Collect IDs from workspace tree (flatData)
        const { workspaceItemIds, noteEntityIds } = collectIdsFromTree(currentWorkspace?.flatData || []);

        // Generate unique temp IDs for workspace item and note entity
        const tempWorkspaceItemId = generateTempId(workspaceItemIds);
        const tempNoteEntityId = generateTempId(noteEntityIds);
        const name = generateUnsavedName(tempNoteEntityId);

        // CRITICAL: parentId must be workspace_items.id (contextData.id), NOT entityId!
        // contextData.id = workspace_items.id of parent folder
        // contextData.entityId = folders.id (entity ID, NOT used for parentId!)
        const parentWorkspaceItemId = contextData?.id ?? null;

        // Get entity ID (support both V1 and V2 structure)
        const parentEntityId = contextData?.entityId ?? contextData?.tagId;

        // Create folder object from contextData
        const parentFolder: Folder | undefined = contextData
            ? {
                  id: parentEntityId,
                  name: contextData.name || contextData.data?.name,
                  description: contextData.description || contextData.data?.description,
                  color: contextData.color || contextData.data?.color,
                  createdAt: new Date(contextData.createdAt || contextData.data?.createdAt),
                  isActive: !contextData.isArchived,
              }
            : undefined;

        // Create temporary note (uses note entity ID)
        const newNote: Note = {
            id: tempNoteEntityId,
            name: name,
            userId: $user.userId || 0,
            description: "",
            hashtags: [],
            statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
            tags: [],
            type: "idea",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: $user.userName || "Unknown",
            deletedAt: null,
        };

        // Create WorkspaceNoteItem for flat array (WorkspaceItemV2 structure)
        const newWorkspaceItem: any = {
            id: tempWorkspaceItemId, // workspace_items.id (unique for workspace item)
            workspaceId: currentWorkspace?.id || 1,
            parentId: parentWorkspaceItemId, // ✅ FIXED: Use workspace_items.id of parent, not entityId!
            entityType: 3, // 3 = note
            entityId: tempNoteEntityId, // notes.id (entity ID)
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            copyInfo: null,
            level: (contextData?.level || 0) + 1,
            position: 0,
            accessType: "owner",
            isOriginal: true,
            isExpanded: false,
            isSelected: false,

            // Note entity data
            data: {
                id: tempNoteEntityId, // notes.id (same as entityId)
                userId: $user.userId ?? 0,
                name: name,
                description: "",
                statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
                copyInfo: null,
            },
        };

        // Add note to currentWorkspace.flatData
        if (currentWorkspace && contextData) {
            const newFlatData = [newWorkspaceItem, ...currentWorkspace.flatData];

            const newWorkspace = {
                ...currentWorkspace,
                flatData: newFlatData,
                noteCount: currentWorkspace.noteCount + 1,
            };
            console.log("✅ New note added to workspace:", {
                workspaceItemId: tempWorkspaceItemId,
                noteEntityId: tempNoteEntityId,
                name,
                parentWorkspaceItemId
            });

            setCurrentWorkspace(newWorkspace);
        }

        // Open tab for editing
        openTab(newNote);

        // Focus on note name field after tab opens
        setShouldFocusNoteName(true);
    };

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
        if (currentWorkspace?.flatData) {
            const allVisibleFolderIds = $getAllVisibleTagIds(currentWorkspace.flatData);
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

            const result = await workspaceService._deleteWorkspaceItems(token || "", currentWorkspace?.id || 1, {
                items: deleteItems,
                isHardDelete,
            });

            // ----------------
            // STEP 5: Update UI after successful deletion
            // ----------------
            if (result && result.success) {
                // Remove folders from tree
                if (currentWorkspace) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentWorkspace.flatData, idsToRemove);

                    setCurrentWorkspace({
                        ...currentWorkspace,
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
        if (!currentWorkspace?.flatData) {
            console.error("❌ Cannot delete: no tree data");
            return;
        }

        // ----------------
        // STEP 2: Find selected folders and filter out workspace root nodes
        // ----------------
        const selectedFolders: Folder[] = [];
        for (const folderId of selectedIds) {
            const folder = $findFolderById(currentWorkspace.flatData, folderId);
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
        const allVisibleFolderIds = $getAllVisibleTagIds(currentWorkspace.flatData);

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

            const result = await workspaceService._deleteWorkspaceItems(token || "", currentWorkspace?.id || 1, {
                items: deleteItems,
                isHardDelete,
            });

            // ----------------
            // STEP 6: Update UI after successful deletion
            // ----------------
            if (result && result.message === "Items deleted successfully") {
                // Remove folders from tree
                if (currentWorkspace) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentWorkspace.flatData, idsToRemove);

                    setCurrentWorkspace({
                        ...currentWorkspace,
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
        const childCount = isMultipleSelected ? 0 : $countChildren(contextData);
        const entityName = isMultipleSelected ? undefined : contextData.name;
        
        const message = getConfirmMessage({
            type: isHardDelete ? "hard-delete" : "soft-delete",
            entityType: "folder",
            count: selectedCount,
            isMultiple: isMultipleSelected,
            entityName,
            childCount
        });

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
        if (!currentWorkspace?.flatData) {
            console.error("❌ Cannot delete: no tree data");
            return;
        }

        try {
            const token = $user.userToken;

            // ===== STEP 3: Filter to top-level parents only =====
            const treeData = buildTreeFromV2Items(currentWorkspace.flatData);
            const topLevelIds = filterTopLevelParents(selectedIds, treeData);

            console.log(`🔍 Filtered ${selectedIds.length} selected to ${topLevelIds.length} top-level parents`);

            if (topLevelIds.length === 0) {
                console.warn("⚠️ No valid items after filtering");
                return;
            }

            // ===== STEP 4: Find items and skip workspace root =====
            const selectedItems: WorkspaceItemV2[] = [];
            for (const itemId of topLevelIds) {
                const item = $findItemById(currentWorkspace.flatData, itemId);
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
            const allItemsToUpdate: WorkspaceItemV2[] = [...selectedItems];

            // Remove duplicates
            const uniqueItemsMap = new Map<number, WorkspaceItemV2>();
            for (const item of allItemsToUpdate) {
                uniqueItemsMap.set(item.id, item);
            }
            const itemsToUpdate = Array.from(uniqueItemsMap.values());

            console.log(`📦 Collected ${itemsToUpdate.length} selected items (type: ${type})`);

            // -------------------------------------------------------
            // STEP 7: BUILD BATCH DELETE/RESTORE REQUESTS
            // -------------------------------------------------------
            // For each selected item, create a DELETE or RESTORE action
            // - action: WorkspaceItemAction.Delete or WorkspaceItemAction.Restore
            // - id: workspace_items.id (V2: item.id = workspace_items.id)
            const batchRequests: UpsertWorkspaceItemRequest[] = itemsToUpdate.map((item) => {
                return {
                    action: type === "soft-delete" ? WorkspaceItemAction.Delete : WorkspaceItemAction.Restore,
                    id: item.id, // ✅ workspace_items.id
                };
            });

            // ===== STEP 8: Call batch upsert API (giống __deleteRestore_SelectedNotes) =====
            const result = await workspaceService._upsertWorkspaceItems(token ?? "", currentWorkspace.id, batchRequests);

            if (!result.success) {
                throw new Error(result.message || "Batch update failed");
            }

            // ===== STEP 9: Post-processing (giống __deleteRestore_SelectedNotes) =====

            if (type === "soft-delete") {
                // Clean up open tabs (giống __deleteRestore_SelectedNotes)
                // In V2: entityType is numeric: 2=folder, 3=note, 4=file
                const folderIds = itemsToUpdate.filter((item) => item.entityType === 2).map((item) => item.id);
                const noteIds = itemsToUpdate.filter((item) => item.entityType === 3).map((item) => item.id);
                const fileIds = itemsToUpdate.filter((item) => item.entityType === 4).map((item) => item.id);

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
            const res = await workspaceService._getWorkspaceTreeV2(token ?? "", currentWorkspace.id);
            if(res && res.success){
                setCurrentWorkspace(res.object as WorkspaceDTO);
                // ===== STEP 10: Clear selection (giống __deleteRestore_SelectedNotes) =====
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
    
                // Show success message
                enqueueSnackbar(`Successfully ${type === "soft-delete" ? "deleted" : "restored"} ${itemsToUpdate.length} item(s)`, { variant: "success" });
            }
            else {
                throw new Error("Failed to reload workspace tree");
            }

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
    const $collectAllDescendants_WorkspaceItems = (item: WorkspaceItemV2): WorkspaceItemV2[] => {
        const descendants: WorkspaceItemV2[] = [item];

        // With V2 flat structure, find all descendants by traversing parentId relationships
        const findDescendants = (parentId: number) => {
            const children = currentWorkspace?.flatData.filter(i => i.parentId === parentId) || [];
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
    const $findItemById = (items: WorkspaceItemV2[], targetId: number): WorkspaceItemV2 | null => {
        // With V2 flat structure, we can just find directly
        return items.find(item => item.id === targetId) || null;
    };

    return {
        createFolder,
        editFolder,
        dhr_items,
        createNewNote,
    };
};
