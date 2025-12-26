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

export const useWorkspaceChildMenuHelper = () => {
    const { auth } = useAuthStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { enqueueSnackbar } = useSnackbar();
    const { contextType, contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { setSelectedFolderIds, setLastSelectedFolderId, currentTree } = useWorkspaceStore();

    const isNote = contextType === constants.workspace.itemTypes.note;
    const isFile = contextType === constants.workspace.itemTypes.file;

    /**
     * Handle delete note
     */
    const __deleteNote = async (noteData: any, isHardDelete: boolean = false) => {
        // ---------
        // STEP 1: Validate input data
        // ---------
        if (!noteData?.id) {
            console.error("❌ Cannot delete note: missing id");
            alert("Cannot delete note: missing note information");
            return;
        }

        // ---------
        // STEP 2: Delete note via service
        // ---------
        try {
            const token = auth.userToken;

            const result = await noteService._deleteNote(token ?? "", noteData.id.toString());
            // ---------
            // STEP 3: Handle success response
            // ---------
            if (result.success) {
                // Clear selection
                setSelectedFolderIds([]);
                setLastSelectedFolderId(null);
            }

            // Reload page to refresh data
            window.location.reload();
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
     */
    const __deleteFile = async (fileData: any, isHardDelete: boolean = false) => {
        // ---------
        // STEP 1: Validate input data
        // ---------
        if (!fileData?.id) {
            console.error("❌ Cannot delete file: missing id");
            alert("Cannot delete file: missing file information");
            return;
        }

        // ---------
        // STEP 2: Delete file via service
        // ---------
        try {
            const token = auth.userToken;
            const workspaceId = currentTree?.workspaceId || 1;

            const result = await workspaceService._deleteWorkspaceItems(token ?? "", workspaceId, {
                items: [{ id: fileData.id, type: 4 as const }], // type 4 = file
                cascade: true,
                isHardDelete: isHardDelete,
            });

            // ---------
            // STEP 3: Handle success response
            // ---------
            if (result.success || result.message === "Items deleted successfully") {
                // Clear selection
                setSelectedFolderIds([]);
                setLastSelectedFolderId(null);

                // Reload page to refresh data
                window.location.reload();
            } else {
                console.error("❌ Delete failed:", result.message);
                alert(`Failed to delete file: ${result.message}`);
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
     * Handle delete with confirmation
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
        let message: string;
        let itemName = contextData.name || "this item";

        if (isNote) {
            // Note deletion messages
            if (isHardDelete) {
                message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${itemName}".\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`;
            } else {
                message = `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`;
            }
        } else if (isFile) {
            // File deletion messages
            if (isHardDelete) {
                message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${itemName}".\n\n❌ This action CANNOT be undone.\n❌ The file will be LOST FOREVER.`;
            } else {
                message = `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`;
            }
        } else {
            return;
        }

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
                if (isNote) {
                    __deleteNote(contextData, isHardDelete);
                } else if (isFile) {
                    __deleteFile(contextData, isHardDelete);
                }
            },
        });
    };

    return {
        deleteItems,
    };
};
