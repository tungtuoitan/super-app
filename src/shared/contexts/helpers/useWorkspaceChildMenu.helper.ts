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
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentWorkspace } = useWorkspaceStore();
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
        // STEP 3: Prepare confirmation message
        // ---------
        if (!isNote && !isFile) {
            return;
        }

        const entityName = isMultipleSelected ? undefined : (contextData.data?.name || contextData.name || "this item");
        const message = getConfirmMessage({
            type: isHardDelete ? "hard-delete" : "soft-delete",
            entityType: isFile ? "file" : "note",
            count: selectedCount,
            isMultiple: isMultipleSelected,
            entityName
        });

        // ---------
        // STEP 4: Show confirmation dialog
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
                // TODO: Support multi-select delete for notes (need batch API or Promise.all)
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
