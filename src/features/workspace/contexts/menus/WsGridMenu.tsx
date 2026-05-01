import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, AlertTriangle as HardDeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useMenuContext, useMenuContextHelper } from "@/shared";

export function WsGridMenu() {
    const { contextData } = useMenuContext();
    const { openConfirmDialog, executeDirectly } = useMenuContextHelper();

    const wsGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempWs = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;
    const anySelectedDeleted = contextData?.selectedWorkspaces?.some((ws: any) => ws.deletedAt !== null && ws.deletedAt !== undefined) ?? false;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddWorkspace! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add
            </MenuItem>

            <MenuDivider />

            {!anySelectedDeleted && (
                <MenuItem
                    onClick={(e) => openConfirmDialog({ type: "soft-delete", entityType: "workspace", count: wsGridSelectedCount, allAreTempItems: allSelectedAreTempWs, onConfirm: contextData?.onSoftDelete!, event: e })}
                >
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {anySelectedDeleted && !allSelectedAreTempWs && (
                <>
                    <MenuItem
                        onClick={(e) => openConfirmDialog({ type: "hard-delete", entityType: "workspace", count: wsGridSelectedCount, allAreTempItems: false, onConfirm: contextData?.onHardDelete!, event: e })}
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
