import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, AlertTriangle as HardDeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";

/**
 * WsGridMenu
 * Context menu for workspace grid/table view
 *
 * Features:
 * - Add new workspace
 * - Delete selected workspaces (single or bulk) - only shown if workspaces are NOT deleted
 * - Hard delete (permanent, cascade all contents) - only shown if workspaces ARE deleted
 * - Restore - only shown if workspaces ARE deleted
 */
export function WsGridMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { openConfirmDialog, executeDirectly } = useOrchestratorContextMenuHelper();

    // Calculate derived values from contextData
    const wsGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempWs = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;

    // Check if any selected workspaces have deletedAt (are in deleted state)
    const anySelectedDeleted = contextData?.selectedWorkspaces?.some((ws: any) => ws.deletedAt !== null && ws.deletedAt !== undefined) ?? false;

    return (
        <>
            {/* Add Workspace */}
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddWorkspace! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add
            </MenuItem>

            <MenuDivider />

            {/* Show Delete option only if workspaces are NOT deleted */}
            {!anySelectedDeleted && (
                <MenuItem
                    onClick={(e) =>
                        openConfirmDialog({
                            type: "soft-delete",
                            entityType: "workspace",
                            count: wsGridSelectedCount,
                            allAreTempItems: allSelectedAreTempWs,
                            onConfirm: contextData?.onSoftDelete!,
                            event: e,
                        })
                    }
                >
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {/* Show Hard Delete and Restore only if workspaces ARE deleted */}
            {anySelectedDeleted && !allSelectedAreTempWs && (
                <>
                    <MenuItem
                        onClick={(e) =>
                            openConfirmDialog({
                                type: "hard-delete",
                                entityType: "workspace",
                                count: wsGridSelectedCount,
                                allAreTempItems: false,
                                onConfirm: contextData?.onHardDelete!,
                                event: e,
                            })
                        }
                        className="text-red-600 hover:bg-red-50"
                    >
                        <HardDeleteIcon className="w-4 h-4 mr-2" />
                        Hard Delete
                    </MenuItem>

                    <MenuItem onClick={() => executeDirectly({ callback: contextData?.onRestore! })}>
                        <RestoreIcon className="w-4 h-4 mr-2" />
                        Restore
                    </MenuItem>
                </>
            )}
        </>
    );
}
