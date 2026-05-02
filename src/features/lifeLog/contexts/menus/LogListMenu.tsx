import { MenuItem } from "@szhsin/react-menu";
import { Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useOrchestratorContextMenuHelper } from "@/shared";
import type { LogListMenuData } from "@/shared";

export function LogListMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();
    const data = contextData as LogListMenuData | null;

    return (
        <MenuItem
            onClick={() => executeDirectly({ callback: data?.onDelete })}
            className="text-red-500"
        >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
        </MenuItem>
    );
}
