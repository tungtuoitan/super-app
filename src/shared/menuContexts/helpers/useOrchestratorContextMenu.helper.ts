/**
 * Context Menu Helper Hook
 * Shared utilities for context menu operations across different entity types
 */

import { useConfirmationPopoverHelper } from "@/shared/hooks/useConfirmationPopover.helper";
import { OrchestratorContextMenuType, useOrchestratorContextMenuStore } from "@/shared/menuContexts/ContextMenu.store";
import { Folder } from "@/features/workspace/types/folder.types";
import { getConfirmMessage } from "@/utils/confirmation-message.utils";

interface OpenConfirmDialogParams {
    type: "soft-delete" | "hard-delete";
    entityType: "note" | "workspace" | "folder";
    count: number;
    allAreTempItems: boolean;
    onConfirm: () => void;
    event: any; 
}

interface ExecuteDirectlyParams {
    callback: () => void;
}

export const useOrchestratorContextMenuHelper = () => {
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { setIsContextMenuOpen, setAnchorPoint, setContextType, setContextData } = useOrchestratorContextMenuStore();

    /**
     * Open confirmation dialog for delete operations
     * Handles both soft delete and hard delete with entity-specific messages
     */
    const openConfirmDialog = ({ type, entityType, count, allAreTempItems, onConfirm, event }: OpenConfirmDialogParams) => {
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
        const confirmMsg = getConfirmMessage({ type, entityType, count, isMultiple });
        const confirmText = type === "hard-delete" ? "Delete Permanently" : "Delete";

        showConfirmation({
            anchorEl: anchorElement,
            title: confirmMsg.title,
            subtitle: confirmMsg.subtitle,
            confirmText,
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
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

    /**
     * Recursively collect all descendant tags (children, grandchildren, etc.)
     * Returns array of all tags in the subtree including the root folder
     */
    const collectAllDescendants = (folder: Folder): Folder[] => {
        const descendants: Folder[] = [folder];

        if (folder.children && folder.children.length > 0) {
            for (const child of folder.children) {
                descendants.push(...collectAllDescendants(child));
            }
        }

        return descendants;
    };

    /**
     * Show context menu at mouse position
     */
    const showContextMenu = (event: React.MouseEvent, type: OrchestratorContextMenuType = "default", data?: any) => {
        event.preventDefault();
        event.stopPropagation();

        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType(type);
        setContextData(data || null);
        setIsContextMenuOpen(true);
    };

    return {
        openConfirmDialog,
        executeDirectly,
        showContextMenu,
    };
};
