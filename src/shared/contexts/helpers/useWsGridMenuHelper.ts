/**
 * Workspace Grid Menu Helper Hook
 * Business logic for workspace grid context menu operations
 */

import { useContextMenuStore } from '@/store/contextMenu/ContextMenuStore';
import { useConfirmationPopover } from '@/shared/hooks/useConfirmationPopover';

export const useWsGridMenuHelper = () => {
    const {
        contextData,
        setIsContextMenuOpen,
    } = useContextMenuStore();

    // Extract data from contextData
    const wsGridSelectedCount = contextData?.selectedIds?.length || 0;
    const wsGridIsMultiple = wsGridSelectedCount > 1;
    const wsGridHasSelection = wsGridSelectedCount > 0;


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
    const handleDelete = (event: any, isHardDelete: boolean = false) => {
        if (!contextData?.onDelete) return;

        setIsContextMenuOpen(false);

        // Extract anchor element from menu event
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        let message: string;

        if (isHardDelete) {
            // Hard delete warning messages
            message = wsGridIsMultiple
                ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${wsGridSelectedCount} selected workspaces and ALL their contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`
                : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this workspace and ALL its contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
        } else {
            // Soft delete messages
            message = wsGridIsMultiple
                ? `Are you sure you want to delete ${wsGridSelectedCount} selected workspaces?\n\n⚠️ This will also delete ALL folders, notes, and files in these workspaces.\n\nThis action cannot be undone.`
                : `Are you sure you want to delete this workspace?\n\n⚠️ This will also delete ALL folders, notes, and files in this workspace.\n\nThis action cannot be undone.`;
        }

        deleteConfirmation.show({
            anchorEl: anchorElement,
            message,
            onConfirm: () => {
                contextData.onDelete(isHardDelete);
            },
        });
    };

    return {
        wsGridSelectedCount,
        wsGridIsMultiple,
        wsGridHasSelection,
        handleDelete,
        deleteConfirmation,
    };
};
