import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useOrchestratorContextMenuHelper } from "@/shared";
import type { WorkspaceSelectorMenuData } from "@/shared";

/**
 * WorkspaceSelectorMenu
 * Right-click context menu on the workspace selector in WorkspaceView
 */
export function WorkspaceSelectorMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly, openConfirmDialog } = useOrchestratorContextMenuHelper();
    const data = contextData as WorkspaceSelectorMenuData | null;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: data?.onAdd })}>
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
            </MenuItem>

            {data?.hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: data?.onEdit })}>
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
                                onConfirm: data?.onDelete,
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
