/**
 * Context Menu Helper Hook
 * Shared utilities for context menu operations across different entity types
 */

import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';
import { useConfirmationPopoverHelper } from '@/hooks/useConfirmationPopover.helper';

type EntityType = 'note' | 'workspace' | 'folder';
type DeleteType = 'soft-delete' | 'hard-delete';

interface OpenConfirmDialogParams {
    type: DeleteType;
    entityType: EntityType;
    count: number;
    allAreTempItems: boolean;
    onConfirm: () => void;
    event: any;
}

interface ExecuteDirectlyParams {
    callback: () => void;
}

export const useContextMenuHelper = () => {
    const { setIsContextMenuOpen } = useContextMenuStore();
    const { showConfirmation } = useConfirmationPopoverHelper();

    /**
     * Generate confirmation message based on entity type and delete type
     */
    const getConfirmMessage = (
        type: DeleteType,
        entityType: EntityType,
        count: number,
        isMultiple: boolean
    ): string => {
        const entityLabel = entityType === 'note' ? 'note' : entityType === 'workspace' ? 'workspace' : 'folder';
        const entityPluralLabel = `${entityLabel}${isMultiple ? 's' : ''}`;

        if (type === 'soft-delete') {
            if (entityType === 'note') {
                return isMultiple
                    ? `Are you sure you want to delete ${count} selected notes?\n\nThis action cannot be undone.`
                    : `Are you sure you want to delete this note?\n\nThis action cannot be undone.`;
            } else if (entityType === 'workspace') {
                return isMultiple
                    ? `Are you sure you want to delete ${count} selected workspaces?\n\n⚠️ This will also delete ALL folders, notes, and files in these workspaces.\n\nThis action cannot be undone.`
                    : `Are you sure you want to delete this workspace?\n\n⚠️ This will also delete ALL folders, notes, and files in this workspace.\n\nThis action cannot be undone.`;
            } else {
                return isMultiple
                    ? `Are you sure you want to delete ${count} selected folders?\n\nThis action cannot be undone.`
                    : `Are you sure you want to delete this folder?\n\nThis action cannot be undone.`;
            }
        } else {
            // hard-delete
            if (entityType === 'note') {
                return isMultiple
                    ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${count} selected notes.\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`
                    : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this note.\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`;
            } else if (entityType === 'workspace') {
                return isMultiple
                    ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${count} selected workspaces and ALL their contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`
                    : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this workspace and ALL its contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
            } else {
                return isMultiple
                    ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${count} selected folders.\n\n❌ This action CANNOT be undone.\n❌ All folder content will be LOST FOREVER.`
                    : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this folder.\n\n❌ This action CANNOT be undone.\n❌ All folder content will be LOST FOREVER.`;
            }
        }
    };

    /**
     * Open confirmation dialog for delete operations
     * Handles both soft delete and hard delete with entity-specific messages
     */
    const openConfirmDialog = ({
        type,
        entityType,
        count,
        allAreTempItems,
        onConfirm,
        event,
    }: OpenConfirmDialogParams) => {
        setIsContextMenuOpen(false);

        // If all selected items are temporary, execute immediately without confirmation
        if (allAreTempItems) {
            onConfirm();
            return;
        }

        // Extract anchor element from menu event
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        const isMultiple = count > 1;
        const message = getConfirmMessage(type, entityType, count, isMultiple);
        const confirmText = type === 'hard-delete' ? 'Delete Permanently' : 'Delete';

        showConfirmation({
            anchorEl: anchorElement,
            message,
            confirmText,
            cancelText: 'Cancel',
            confirmColor: 'destructive',
            buttonVariant: 'default',
            zIndex: 20000,
            onConfirm,
        });
    };

    /**
     * Execute action directly without confirmation
     * Closes context menu and executes callback
     */
    const executeDirectly = ({ callback }: ExecuteDirectlyParams) => {
        setIsContextMenuOpen(false);
        callback();
    };

    return {
        openConfirmDialog,
        executeDirectly,
    };
};
