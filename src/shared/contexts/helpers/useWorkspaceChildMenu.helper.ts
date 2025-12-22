/**
 * Workspace Child Menu Helper Hook
 * Business logic for note and file context menu operations
 * Shared helper for both note and file nodes in explorer tree
 */

import { useContextMenuStore, ContextMenuType } from '@/store/contextMenu/ContextMenu.store';
import { useExplorerStore } from '@/store/explorer/Explorer.store';
import { useFolderDialogHelper } from '@/hooks/explorer/useFolderDialog.helper';
import { useConfirmationPopover } from '@/shared/hooks/useConfirmationPopover';
import { constants } from '@/utils/constants';
import { _deleteNote } from '@/services/note.service';
import { _deleteWorkspaceItems } from '@/services/workspace.service';
import { storageService } from '@/services/storage.service';

export const useWorkspaceChildMenuHelper = () => {
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

    const isNote = contextType === constants.itemTypes.note;
    const isFile = contextType === constants.itemTypes.file;

    /**
     * Handle edit item (note only)
     */
    const handleEditItem = () => {
        if (!isNote || !contextData) return;

        console.log('✏️ Child Menu: Edit note clicked', contextData);
        setIsContextMenuOpen(false);
        openFolderDialog('edit', constants.itemTypes.note, contextData, null);
    };

    /**
     * Handle view info
     */
    const handleViewInfo = () => {
        console.log('ℹ️ Child Menu: View info clicked', contextData);
        setIsContextMenuOpen(false);
        // TODO: Implement view info functionality
    };

    /**
     * Handle delete note
     */
    const handleDeleteNote = async (noteData: any, isHardDelete: boolean = false) => {
        console.log('🗑️ Deleting note:', noteData, 'isHardDelete:', isHardDelete);

        if (!noteData?.id) {
            console.error('❌ Cannot delete note: missing id');
            alert('Cannot delete note: missing note information');
            return;
        }

        try {
            const token = storageService.getString('token');

            console.log(`🗑️ Deleting note ID: ${noteData.id}`, noteData.name);

            const result = await _deleteNote(token ?? '', noteData.id.toString());
            
            // Check API response success
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete note');
            }

            console.log('✅ Successfully deleted note');

            // Clear selection
            setSelectedFolderIds([]);
            setLastSelectedFolderId(null);

            // Reload page to refresh data
            window.location.reload();
        } catch (error) {
            console.error('❌ Failed to delete note:', error);
            alert(`Error deleting note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    /**
     * Handle delete file
     */
    const handleDeleteFile = async (fileData: any, isHardDelete: boolean = false) => {
        console.log('🗑️ Deleting file:', fileData, 'isHardDelete:', isHardDelete);

        if (!fileData?.id) {
            console.error('❌ Cannot delete file: missing id');
            alert('Cannot delete file: missing file information');
            return;
        }

        try {
            const token = storageService.getString('token');
            const workspaceId = currentTree?.workspaceId || 1;

            console.log(`🗑️ Deleting file ID: ${fileData.id}`, fileData.name);

            const result = await _deleteWorkspaceItems(token ?? '', workspaceId, {
                items: [{ id: fileData.id, type: 4 as const }], // type 4 = file
                cascade: true,
                isHardDelete: isHardDelete,
            });

            console.log('✅ API response:', result);

            if (result.success || result.message === 'Items deleted successfully') {
                console.log('✅ Successfully deleted file');

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
            alert(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    /**
     * Confirmation popover for delete actions
     */
    const deleteConfirmation = useConfirmationPopover({
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'destructive',
        buttonVariant: 'default',
        zIndex: 20000,
    });

    /**
     * Handle delete with confirmation
     */
    const onDeleteItemClick = (event: any, isHardDelete: boolean = false) => {
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

        deleteConfirmation.show({
            anchorEl: anchorElement,
            message,
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
        handleEditItem,
        handleViewInfo,
        onDeleteItemClick,
        deleteConfirmation,
    };
};
