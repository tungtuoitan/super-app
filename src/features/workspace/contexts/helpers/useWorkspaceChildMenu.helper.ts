/**
 * Workspace Child Menu Helper Hook
 * Business logic for note and file context menu operations
 * Shared helper for both note and file nodes in workspace tree
 */

import { useWorkspaceStore } from "../../store/Workspace.store";
import { useConfirmationPopoverHelper } from "@/shared";
import { constants } from "@/utils/constants";
import { noteService } from "@/features/note/service/note.service";
import { useAuthStore } from "@/shell";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import { useOrchestratorContextMenuStore } from "@/shared";
import {workspaceService} from "../../service/workspace.service";
import { getConfirmMessage } from "@/utils/confirmation-message.utils";
import { useWorkspaceLoader } from "../../hooks/useWorkspace.loader";
import { filterTopLevelParents, buildTreeFromV2Items } from "../../hooks/tree.miniHelper";
import type { UpsertWorkspaceItemRequest } from "../../types/workspace.types";
import { WorkspaceItemAction } from "../../types/workspace.types";
import type { WorkspaceItemV2 } from "@/features/workspace/types/workspace-v2.types";
import type { WorkspaceDTO } from "../../types/workspace-dto.types";
import { useEditorTabHelper } from "@/shell";
import {useConsoleHelper} from "@/shell";

export const useWorkspaceChildMenuHelper = () => {
    const { $user } = useAuthStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const _console = useConsoleHelper();
    const { contextType, contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();
    const { processTabAfterDelete } = useEditorTabHelper();

    const isNote = contextType === constants.workspace.itemTypes.note;
    const isFile = contextType === constants.workspace.itemTypes.file;

    // Multi-select check
    const selectedCount = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;

    /**
     * Helper: Find item by ID in workspace flat data
     */
    const $findItemById = (items: WorkspaceItemV2[], targetId: number): WorkspaceItemV2 | null => {
        // With V2 flat structure, we can just find directly
        return items.find(item => item.id === targetId) || null;
    };

    /**
     * Handle delete note
     * IMPORTANT: noteData is WorkspaceNoteItem structure:
     * - noteData.id = workspace_items.id (workspace item ID)
     * - noteData.entityId = notes.id (entity ID - use this for note service!)
     * - noteData.data.id = notes.id (same as entityId)
     */
    const __deleteNote = async (noteData: any, isHardDelete: boolean = false) => {
        // ---------
        // STEP 1: Validate input data
        // ---------
        const noteEntityId = noteData?.entityId ?? noteData?.data?.id;
        if (!noteEntityId) {
            console.error("❌ Cannot delete note: missing entityId");
            _console.error("Cannot delete note: missing note information");
            return;
        }

        // ---------
        // STEP 2: Delete note via service
        // ---------
        try {
            const token = $user.userToken;

            // ✅ Use entityId (notes.id) for note service
            const result = await noteService._deleteNote(token ?? "", noteEntityId.toString());
            // ---------
            // STEP 3: Handle success response
            // ---------
            if (result.success) {
                // Clear selection
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
            }

            loadTree()
        } catch (error) {
            // ---------
            // STEP 4: Handle error
            // ---------
            console.error("❌ Failed to delete note:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Error deleting note: ${errorMessage}`);
            }
        }
    };

    /**
     * Handle delete file
     * IMPORTANT: fileData is WorkspaceFileItem structure:
     * - fileData.id = workspace_items.id (workspace item ID - use this for workspace service!)
     * - fileData.entityId = files.id (entity ID)
     */
    const __deleteFile = async (fileData: any, isHardDelete: boolean = false) => {
        // ---------
        // STEP 1: Validate input data
        // ---------
        const workspaceItemId = fileData?.id;
        if (!workspaceItemId) {
            console.error("❌ Cannot delete file: missing workspace item id");
            _console.error("Cannot delete file: missing file information");
            return;
        }

        // ---------
        // STEP 2: Delete file via service
        // ---------
        try {
            const token = $user.userToken;
            const workspaceId = currentWorkspace?.id || 1;

            // ✅ Use workspace_items.id for workspace service
            const result = await workspaceService._deleteWorkspaceItems(token ?? "", workspaceId, {
                items: [{ id: workspaceItemId, type: 4 as const }], // type 4 = file
                cascade: true,
                isHardDelete: isHardDelete,
            });

            // ---------
            // STEP 3: Handle success response
            // ---------
            if (result.success || result.message === "Items deleted successfully") {
                // Clear selection
                setSelectedItemIds([]);
                setLastSelectedItemId(null);

                // Reload page to refresh data
                window.location.reload();
            } else {
                console.error("❌ Delete failed:", result.message);
                _console.error(`Failed to delete file: ${result.message}`);
            }
        } catch (error) {
            // ---------
            // STEP 4: Handle error
            // ---------
            console.error("❌ Failed to delete file:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Error deleting file: ${errorMessage}`);
            }
        }
    };

    /**
     * Delete/Restore selected workspace items using batch upsert API
     * Follows __deleteRestore_SelectedItems pattern from useWorkspaceFolderMenu.helper.ts
     * Pattern: 100% follows folder helper batch pattern
     */
    const __deleteRestore_SelectedItems = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        // ===== STEP 1: Get selected items =====
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

            // -------------------------------------------------------
            // STEP 6: BUILD BATCH DELETE/RESTORE REQUESTS
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

            // ===== STEP 7: Call batch upsert API =====
            const result = await workspaceService._upsertWorkspaceItems(token ?? "", currentWorkspace.id, batchRequests);

            if (!result.success) {
                throw new Error(result.message || "Batch update failed");
            }

            // ===== STEP 8: Post-processing =====

            if (type === "soft-delete") {
                // Clean up open tabs
                // In V2: entityType is numeric: 2=folder, 3=note, 4=file
                const noteIds = itemsToUpdate.filter((item) => item.entityType === 3).map((item) => item.entityId);
                const fileIds = itemsToUpdate.filter((item) => item.entityType === 4).map((item) => item.entityId);

                if (noteIds.length > 0) {
                    processTabAfterDelete(noteIds, "note");
                }
                if (fileIds.length > 0) {
                    processTabAfterDelete(fileIds, "file");
                }
            }

            // Reload workspace tree
            const res = await workspaceService._getWorkspaceTreeV2(token ?? "", currentWorkspace.id);
            if(res && res.success){
                setCurrentWorkspace(res.object as WorkspaceDTO);
                // ===== STEP 9: Clear selection =====
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
     * Wrapper for delete/restore with confirmation popover
     * Similar to dhr_items in folder helper
     */
    const deleteItems = (event: any, isHardDelete: boolean = false) => {
        // ----------------
        // STEP 1: Validate context data
        // ----------------
        if (!contextData) return;

        // Close context menu
        setIsContextMenuOpen(false);

        // ----------------
        // STEP 2: Extract anchor element for popover positioning
        // ----------------
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        // ----------------
        // STEP 3: Build confirmation message based on delete type and selection
        // ----------------
        const entityName = isMultipleSelected ? undefined : (contextData.data?.name || contextData.name || "this item");

        const confirmMsg = getConfirmMessage({
            type: isHardDelete ? "hard-delete" : "soft-delete",
            entityType: isFile ? "file" : "note",
            count: selectedCount,
            isMultiple: isMultipleSelected,
            entityName
        });

        // ----------------
        // STEP 4: Show confirmation popover and handle user response
        // ----------------
        showConfirmation({
            anchorEl: anchorElement,
            title: confirmMsg.title,
            subtitle: confirmMsg.subtitle,
            confirmText: isHardDelete ? "Delete Permanently" : "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => {
                if (isHardDelete) {
                    // Hard delete - use old API (TODO: implement batch hard delete later)
                    // NOTE: For now, hard delete still uses old API that deletes the note entity
                    if (isNote) {
                        __deleteNote(contextData, isHardDelete);
                    } else if (isFile) {
                        __deleteFile(contextData, isHardDelete);
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
     * Handle edit note (rename)
     */
    const editNote = (noteData: any) => {
        if (!noteData) return;

        // TODO: Implement rename dialog for note
        // Similar to editFolder in useWorkspaceFolderMenu.helper.ts
    };

    return {
        deleteItems,
        editNote,
    };
};
