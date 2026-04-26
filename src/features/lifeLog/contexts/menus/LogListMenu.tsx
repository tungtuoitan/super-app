import { MenuItem } from "@szhsin/react-menu";
import { Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared/menuContexts/ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";

export function LogListMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();

    return (
        <MenuItem
            onClick={() => executeDirectly({ callback: contextData?.onDelete })}
            className="text-red-500"
        >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
        </MenuItem>
    );
}
