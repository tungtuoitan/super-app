import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Pencil, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";

export function TrackPanelMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onEdit })}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
            </MenuItem>
            <MenuDivider />
            <MenuItem
                onClick={() => executeDirectly({ callback: contextData?.onDelete })}
                className="text-red-500"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
        </>
    );
}
