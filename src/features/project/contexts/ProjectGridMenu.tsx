import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, RotateCcw as RestoreIcon, Layers as MultiProjectIcon } from "lucide-react";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";

/**
 * ProjectGridMenu
 * Context menu for project grid/table view
 *
 * Features:
 * - Add new project
 * - Delete selected projects (soft delete) - only shown if projects are NOT deleted
 * - Restore - only shown if projects ARE deleted
 */
export function ProjectGridMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { openConfirmDialog, executeDirectly } = useOrchestratorContextMenuHelper();

    // Calculate derived values from contextData
    const projectGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempProjects = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;

    // Check if any selected projects have deletedAt (are in deleted state)
    const anySelectedDeleted =
        contextData?.selectedProjects?.some((p: any) => p.deletedAt !== null && p.deletedAt !== undefined) ?? false;

    return (
        <>
            {/* Add Project */}
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddProject! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Project
            </MenuItem>

            {/* Open Multiple Projects view - always available */}
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onOpenMultiProjectView! })}>
                <MultiProjectIcon className="w-4 h-4 mr-2" />
                Open Multiple Projects
            </MenuItem>

            <MenuDivider />

            {/* Show Delete option only if projects are NOT deleted */}
            {!anySelectedDeleted && projectGridSelectedCount > 0 && (
                <MenuItem
                    onClick={(e) =>
                        openConfirmDialog({
                            type: "soft-delete",
                            entityType: "workspace", // Reuse workspace confirmation for now
                            count: projectGridSelectedCount,
                            allAreTempItems: allSelectedAreTempProjects,
                            onConfirm: contextData?.onSoftDelete!,
                            event: e,
                        })
                    }
                >
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {/* Show Restore only if projects ARE deleted */}
            {anySelectedDeleted && !allSelectedAreTempProjects && (
                <MenuItem onClick={() => executeDirectly({ callback: contextData?.onRestore! })}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            )}
        </>
    );
}
