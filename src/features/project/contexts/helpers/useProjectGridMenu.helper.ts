/**
 * Project Grid Menu Helper — Pattern B
 * Reads typed contextData; calls useProjectGridHelper directly.
 * No callbacks stored in contextData.
 */

import { useOrchestratorContextMenuStore } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";
import { getGenericConfirmMessage } from "@/shared";
import type { ProjectGridMenuData } from "@/shared";
import { useProjectGridHelper } from "../../hooks/useProjectGrid.helper";

export const useProjectGridMenuHelper = () => {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { createNewProject, deleteRestoreProjects, openProjectTab, openMultiProjectTab } = useProjectGridHelper();

    const data = contextData as ProjectGridMenuData | null;
    const selectedIds      = data?.selectedIds      ?? [];
    const selectedProjects = data?.selectedProjects  ?? [];

    const selectedCount          = selectedIds.length;
    const allAreTempProjects      = selectedCount > 0 && selectedIds.every((id) => id < 0);
    const anySelectedDeleted      = selectedProjects.some(
        (p) => p.deletedAt !== null && p.deletedAt !== undefined,
    );

    const addProject = () => {
        setIsContextMenuOpen(false);
        createNewProject();
    };

    const openMultiProjectView = () => {
        setIsContextMenuOpen(false);
        openMultiProjectTab([]);
    };

    const softDelete = (anchorEl: HTMLElement | null) => {
        setIsContextMenuOpen(false);
        if (allAreTempProjects) {
            deleteRestoreProjects(selectedIds, "soft-delete");
            return;
        }
        const msg = getGenericConfirmMessage({
            type: "soft-delete",
            entityType: "project",
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
            onConfirm: () => deleteRestoreProjects(selectedIds, "soft-delete"),
        });
    };

    const restore = () => {
        setIsContextMenuOpen(false);
        deleteRestoreProjects(selectedIds, "restore");
    };

    return {
        selectedCount,
        allAreTempProjects,
        anySelectedDeleted,
        addProject,
        openMultiProjectView,
        softDelete,
        restore,
    };
};
