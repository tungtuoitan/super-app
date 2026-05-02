/**
 * Workspace Grid Menu Helper — Pattern B
 * Reads typed contextData; calls useWsGridHelper directly.
 * No callbacks stored in contextData.
 */

import { useMenuContext, useMenuContextHelper } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";
import { getGenericConfirmMessage } from "@/shared";
import type { WsGridMenuData } from "@/shared";
import { useWsGridHelper } from "../../hooks/ws/useWsGrid.helper";

export const useWsGridMenuHelper = () => {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { createNewWorkspace, deleteRestoreWorkspaces, hardDeleteWorkspaces } = useWsGridHelper();

    const data = contextData as WsGridMenuData | null;
    const selectedIds        = data?.selectedIds        ?? [];
    const selectedWorkspaces = data?.selectedWorkspaces ?? [];

    const selectedCount        = selectedIds.length;
    const allAreTempWorkspaces = selectedCount > 0 && selectedIds.every((id) => id < 0);
    const anySelectedDeleted   = selectedWorkspaces.some(
        (ws) => ws.deletedAt !== null && ws.deletedAt !== undefined,
    );

    const addWorkspace = () => {
        setIsMenuContextOpen(false);
        createNewWorkspace();
    };

    const softDelete = (anchorEl: HTMLElement | null) => {
        setIsMenuContextOpen(false);
        if (allAreTempWorkspaces) {
            deleteRestoreWorkspaces(selectedIds, "soft-delete");
            return;
        }
        const msg = getGenericConfirmMessage({
            type: "soft-delete",
            entityType: "workspace",
            count: selectedCount,
            isMultiple: selectedCount > 1,
        });
        showConfirmation({
            anchorEl,
            title: msg.title,
            subtitle: msg.subtitle,
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => deleteRestoreWorkspaces(selectedIds, "soft-delete"),
        });
    };

    const hardDelete = (anchorEl: HTMLElement | null) => {
        setIsMenuContextOpen(false);
        const msg = getGenericConfirmMessage({
            type: "hard-delete",
            entityType: "workspace",
            count: selectedCount,
            isMultiple: selectedCount > 1,
        });
        showConfirmation({
            anchorEl,
            title: msg.title,
            subtitle: msg.subtitle,
            confirmText: "Delete Permanently",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => hardDeleteWorkspaces(selectedIds),
        });
    };

    const restore = () => {
        setIsMenuContextOpen(false);
        deleteRestoreWorkspaces(selectedIds, "restore");
    };

    return {
        selectedCount,
        allAreTempWorkspaces,
        anySelectedDeleted,
        addWorkspace,
        softDelete,
        hardDelete,
        restore,
    };
};
