import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";

/**
 * WorkspaceSelectorMenu
 * Right-click context menu on the workspace selector in WorkspaceView
 *
 * contextData shape:
 *   onAdd:    () => void  — creates a new workspace tab
 *   onEdit:   () => void  — opens the current workspace tab for editing
 *   onDelete: () => void  — soft-deletes the current workspace
 *   hasSelected: boolean  — whether a workspace is currently selected
 */
export function WorkspaceSelectorMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly, openConfirmDialog } = useOrchestratorContextMenuHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAdd })}>
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
            </MenuItem>

            {contextData?.hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: contextData?.onEdit })}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Open Workspace
                    </MenuItem>
                    <MenuItem
                        onClick={(e) =>
                            openConfirmDialog({
                                type: "soft-delete",
                                entityType: "workspace",
                                count: 1,
                                allAreTempItems: false,
                                onConfirm: contextData?.onDelete,
                                event: e,
                            })
                        }
                        className="text-red-500"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </MenuItem>
                </>
            )}
        </>
    );
}
