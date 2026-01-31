import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";

/**
 * TaskGridMenu
 * Context menu for task grid/table view
 *
 * Features:
 * - Add new task
 * - Delete selected tasks (soft delete) - only shown if tasks are NOT deleted
 * - Restore - only shown if tasks ARE deleted
 */
export function TaskGridMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { openConfirmDialog, executeDirectly } = useOrchestratorContextMenuHelper();

    // Calculate derived values from contextData
    const taskGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempTasks = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;

    // Check if any selected tasks have deletedAt (are in deleted state)
    const anySelectedDeleted =
        contextData?.selectedTasks?.some((t: any) => t.deletedAt !== null && t.deletedAt !== undefined) ?? false;

    return (
        <>
            {/* Add Task */}
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddTask! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>

            <MenuDivider />

            {/* Show Delete option only if tasks are NOT deleted */}
            {!anySelectedDeleted && taskGridSelectedCount > 0 && (
                <MenuItem
                    onClick={(e) =>
                        openConfirmDialog({
                            type: "soft-delete",
                            entityType: "workspace", // Reuse workspace confirmation for now
                            count: taskGridSelectedCount,
                            allAreTempItems: allSelectedAreTempTasks,
                            onConfirm: contextData?.onSoftDelete!,
                            event: e,
                        })
                    }
                >
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {/* Show Restore only if tasks ARE deleted */}
            {anySelectedDeleted && !allSelectedAreTempTasks && (
                <MenuItem onClick={() => executeDirectly({ callback: contextData?.onRestore! })}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            )}
        </>
    );
}
