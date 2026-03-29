import React from "react";
import { MenuItem } from "@szhsin/react-menu";
import { Plus as AddIcon } from "lucide-react";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";

/**
 * TaskFlowMenu
 * Context menu for the Task Flow canvas (right-click on empty pane).
 * - Add new task at the clicked position
 */
export function TaskFlowMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddTask })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>
        </>
    );
}
