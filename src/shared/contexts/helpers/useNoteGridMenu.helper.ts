/**
 * Note Grid Menu Helper Hook
 * Business logic for note grid context menu operations
 */

import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';
import { useConfirmationPopoverHelper } from '@/hooks/useConfirmationPopover.helper';

export const useNoteGridMenuHelper = () => {
    const {
        contextData,
        setIsContextMenuOpen,
    } = useContextMenuStore();
    
    const { showConfirmation } = useConfirmationPopoverHelper();

    // Extract data from contextData
    const noteGridSelectedCount = contextData?.selectedIds?.length || 0;
    const noteGridIsMultiple = noteGridSelectedCount > 1;

    /**
     * Handle add note
     */
    const handleAddNote = () => {
        if (contextData?.onAddNote) {
            setIsContextMenuOpen(false);
            contextData.onAddNote();
        }
    };

    /**
     * Handle delete with confirmation
     */
    const handleDelete = (event: any, isHardDelete: boolean = false) => {
        if (!contextData?.onDelete) return;

        setIsContextMenuOpen(false);

        // Extract anchor element from menu event
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        const message = noteGridIsMultiple
            ? isHardDelete
                ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${noteGridSelectedCount} selected notes.\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`
                : `Are you sure you want to delete ${noteGridSelectedCount} selected notes?\n\nThis action cannot be undone.`
            : isHardDelete
            ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this note.\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`
            : `Are you sure you want to delete this note?\n\nThis action cannot be undone.`;

        showConfirmation({
            anchorEl: anchorElement,
            message,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'destructive',
            buttonVariant: 'default',
            zIndex: 20000,
            onConfirm: () => {
                contextData.onDelete(isHardDelete);
            },
        });
    };

    return {
        noteGridSelectedCount,
        noteGridIsMultiple,
        handleAddNote,
        handleDelete,
    };
};
