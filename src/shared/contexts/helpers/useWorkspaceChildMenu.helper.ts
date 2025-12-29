/**
 * Workspace Child Menu Helper Hook
 * Business logic for note and file context menu operations
 * Shared helper for both note and file nodes in workspace tree
 */

import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { constants } from "@/utils/constants";
import { noteService } from "@/services/note.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import {workspaceService} from "@/services/workspace.service";
import { getConfirmMessage } from "@/utils/confirmation-message.utils";
import { useWorkspaceLoader } from "@/hooks/index";

export const useWorkspaceChildMenuHelper = () => {
    const { $user } = useAuthStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { enqueueSnackbar } = useSnackbar();
    const { contextType, contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader()

    const isNote = contextType === constants.workspace.itemTypes.note;
    const isFile = contextType === constants.workspace.itemTypes.file;

    // Multi-select check
    const selectedCount = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;

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
            enqueueSnackbar("Cannot delete note: missing note information", { variant: "error" });
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
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Error deleting note: ${errorMessage}`, { variant: "error" });
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
            enqueueSnackbar("Cannot delete file: missing file information", { variant: "error" });
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
                enqueueSnackbar(`Failed to delete file: ${result.message}`, { variant: "error" });
            }
        } catch (error) {
            // ---------
            // STEP 4: Handle error
            // ---------
            console.error("❌ Failed to delete file:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Error deleting file: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    /**
     * Handle delete with confirmation - SUPPORTS MULTI-SELECT
     * Logic:
     * 1. Split selected items into NEW items (ID < 0) and EXISTING items (ID > 0)
     * 2. Remove new items from workspace state immediately (no API call)
     * 3. Only call API delete if there are existing items
     * 4. No notification for new items deletion (silent state update)
     */
    const deleteItems = (event: any, isHardDelete: boolean = false) => {
        // ---------
        // STEP 1: Validate context data
        // ---------
        if (!contextData) return;

        // ---------
        // STEP 2: Close context menu
        // ---------
        setIsContextMenuOpen(false);

        // Extract anchor element from menu event
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        // ---------
        // STEP 3: Split selected items into NEW and EXISTING
        // ---------
        if (!isNote && !isFile) {
            return;
        }

        // Get all selected workspace item IDs (using contextData.id for single, or selectedItemIds for multi)
        const itemsToDelete = isMultipleSelected 
            ? selectedItemIds 
            : [contextData.id];

        // Split into new items (ID < 0, virtual) and existing items (ID > 0, in database)
        const newItemIds = itemsToDelete.filter(id => id < 0);
        const existingItemIds = itemsToDelete.filter(id => id > 0);

        console.log("🗑️ Delete items split:", { 
            total: itemsToDelete.length,
            newItems: newItemIds.length, 
            existingItems: existingItemIds.length 
        });

        // ---------
        // STEP 4: Handle NEW items deletion (state only, no API)
        // ---------
        if (newItemIds.length > 0 && currentWorkspace) {
            // Remove new items from workspace flatData
            const updatedFlatData = currentWorkspace.flatData?.filter(
                item => !newItemIds.includes(item.id)
            ) || [];

            // Update workspace state
            setCurrentWorkspace({
                ...currentWorkspace,
                flatData: updatedFlatData
            });

            // Clear selection for deleted new items
            setSelectedItemIds(prev => prev.filter(id => !newItemIds.includes(id)));
            setLastSelectedItemId(null);

            console.log(`✅ Removed ${newItemIds.length} new item(s) from state (no API call)`);
        }

        // ---------
        // STEP 5: If no existing items, done (silent delete)
        // ---------
        if (existingItemIds.length === 0) {
            console.log("✅ All items were new items - deleted from state only");
            return;
        }

        // ---------
        // STEP 6: Prepare confirmation message for EXISTING items only
        // ---------
        const existingCount = existingItemIds.length;
        const isMultipleExisting = existingCount > 1;
        const entityName = isMultipleExisting ? undefined : (contextData.data?.name || contextData.name || "this item");
        
        const message = getConfirmMessage({
            type: isHardDelete ? "hard-delete" : "soft-delete",
            entityType: isFile ? "file" : "note",
            count: existingCount,
            isMultiple: isMultipleExisting,
            entityName
        });

        // ---------
        // STEP 7: Show confirmation dialog for EXISTING items
        // ---------
        showConfirmation({
            anchorEl: anchorElement,
            message,
            confirmText: isHardDelete ? "Delete Permanently" : "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => {
                // Only delete existing items via API
                // TODO: Support batch delete for multiple existing items
                if (isNote) {
                    __deleteNote(contextData, isHardDelete);
                } else if (isFile) {
                    __deleteFile(contextData, isHardDelete);
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
        console.log("Edit note:", noteData);
        alert("Edit note feature coming soon!");
    };

    return {
        deleteItems,
        editNote,
    };
};
