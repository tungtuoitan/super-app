import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useMenuContextHelper, useMenuContext } from "@/shared";

export function KMenu() {
    const { contextData } = useMenuContext();
    const { executeDirectly, openConfirmDialog } = useMenuContextHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAdd })}>
                <Plus className="w-4 h-4 mr-2" />
                New Knowledge
            </MenuItem>

            {contextData?.hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: contextData?.onEdit })}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Open Knowledge
                    </MenuItem>
                    <MenuItem
                        onClick={(e) => openConfirmDialog({ type: "soft-delete", entityType: "workspace", count: 1, allAreTempItems: false, onConfirm: contextData?.onDelete, event: e })}
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
