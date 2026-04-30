import React from "react";
import { MenuItem } from "@szhsin/react-menu";
import { Plus as AddIcon } from "lucide-react";
import { useMenuContext } from "@/shared";

export function TaskFlowMenu() {
    const { contextData, executeDirectly } = useMenuContext();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddTask })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>
        </>
    );
}
