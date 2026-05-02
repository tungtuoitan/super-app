import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Pencil, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useOrchestratorContextMenuHelper } from "@/shared";
import type { TrackPanelMenuData } from "@/shared";

export function TrackPanelMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();
    const data = contextData as TrackPanelMenuData | null;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: data?.onEdit })}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
            </MenuItem>
            <MenuDivider />
            <MenuItem
                onClick={() => executeDirectly({ callback: data?.onDelete })}
                className="text-red-500"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
        </>
    );
}
