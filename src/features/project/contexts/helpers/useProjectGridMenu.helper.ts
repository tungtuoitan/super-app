/**
 * Project Grid Menu Helper — Pattern B
 * Reads typed contextData; calls useProjectGridHelper directly.
 * No callbacks stored in contextData.
 */

import { useMenuContext, useMenuContextHelper } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";
import { getGenericConfirmMessage } from "@/shared";
import type { ProjectGridMenuData } from "@/shared";
import { useProjectGridHelper } from "../../hooks/useProjectGrid.helper";

export const useProjectGridMenuHelper = () => {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
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
        setIsMenuContextOpen(false);
        createNewProject();
    };

    const openMultiProjectView = () => {
        setIsMenuContextOpen(false);
        openMultiProjectTab([]);
    };

    const softDelete = (anchorEl: HTMLElement | null) => {
        setIsMenuContextOpen(false);
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
        setIsMenuContextOpen(false);
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
