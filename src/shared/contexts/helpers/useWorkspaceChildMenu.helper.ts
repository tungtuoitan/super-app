/**
 * Workspace Child Menu Helper Hook
 * Business logic for note and file context menu operations
 * Shared helper for both note and file nodes in explorer tree
 */

import { useContextMenuStore, ContextMenuType } from '@/store/contextMenu/ContextMenu.store';
import { useExplorerStore } from '@/store/explorer/Explorer.store';
import { useFolderDialogHelper } from '@/hooks/explorer/useFolderDialog.helper';
import { useConfirmationPopoverHelper } from '@/hooks/useConfirmationPopover.helper';
import { constants } from '@/utils/constants';
import { _deleteNote } from '@/services/note.service';
import { _deleteWorkspaceItems } from '@/services/workspace.service';
import { storageService } from '@/services/storage.service';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';
import { useSnackbar } from 'notistack';

export const useWorkspaceChildMenuHelper = () => {
    const { auth } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const {
        contextType,
        contextData,
        setIsContextMenuOpen,
    } = useContextMenuStore();

    const {
        setSelectedFolderIds,
        setLastSelectedFolderId,
        currentTree,
    } = useExplorerStore();

    const { openFolderDialog } = useFolderDialogHelper();

    const isNote = contextType === constants.workspace.itemTypes.note;
    const isFile = contextType === constants.workspace.itemTypes.file;

    /**
     * Handle edit item (note only)
     */
    const editItem = () => {
        if (!isNote || !contextData) return;

        setIsContextMenuOpen(false);
        openFolderDialog('edit', constants.workspace.itemTypes.note, contextData, null);
    };

    /**
     * Handle delete note
     */
    const handleDeleteNote = async (noteData: any, isHardDelete: boolean = false) => {

        if (!noteData?.id) {
            console.error('❌ Cannot delete note: missing id');
            alert('Cannot delete note: missing note information');
            return;
        }

        try {
            const token = auth.userToken;

            const result = await _deleteNote(token ?? '', noteData.id.toString());

            // Clear selection
            setSelectedFolderIds([]);
            setLastSelectedFolderId(null);

            // Reload page to refresh data
            window.location.reload();
        } catch (error) {
            console.error('❌ Failed to delete note:', error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Error deleting note: ${errorMessage}`, { variant: 'error' });
            }
        }
    };

    /**
     * Handle delete file
     */
    const handleDeleteFile = async (fileData: any, isHardDelete: boolean = false) => {

        if (!fileData?.id) {
            console.error('❌ Cannot delete file: missing id');
            alert('Cannot delete file: missing file information');
            return;
        }

        try {
            const token = auth.userToken;
            const workspaceId = currentTree?.workspaceId || 1;

            const result = await _deleteWorkspaceItems(token ?? '', workspaceId, {
                items: [{ id: fileData.id, type: 4 as const }], // type 4 = file
                cascade: true,
                isHardDelete: isHardDelete,
            });

            if (result.success || result.message === 'Items deleted successfully') {

                // Clear selection
                setSelectedFolderIds([]);
                setLastSelectedFolderId(null);

                // Reload page to refresh data
                window.location.reload();
            } else {
                console.error('❌ Delete failed:', result.message);
                alert(`Failed to delete file: ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Failed to delete file:', error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Error deleting file: ${errorMessage}`, { variant: 'error' });
            }
        }
    };

    const { showConfirmation } = useConfirmationPopoverHelper();

    /**
     * Handle delete with confirmation
     */
    const deleteItems = (event: any, isHardDelete: boolean = false) => {
        if (!contextData) return;

        setIsContextMenuOpen(false);

        // Extract anchor element from menu event
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        let message: string;
        let itemName = contextData.name || 'this item';

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

        showConfirmation({
            anchorEl: anchorElement,
            message,
            confirmText: isHardDelete ? 'Delete Permanently' : 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'destructive',
            buttonVariant: 'default',
            zIndex: 20000,
            onConfirm: () => {
                if (isNote) {
                    handleDeleteNote(contextData, isHardDelete);
                } else if (isFile) {
                    handleDeleteFile(contextData, isHardDelete);
                }
            },
        });
    };

    return {
        editItem,
        deleteItems,
    };
};
