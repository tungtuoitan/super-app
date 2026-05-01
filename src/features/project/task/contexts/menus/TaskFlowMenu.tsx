import React from "react";
import { MenuItem } from "@szhsin/react-menu";
import { Plus as AddIcon } from "lucide-react";
import { useMenuContext, useMenuContextHelper } from "@/shared";

export function TaskFlowMenu() {
    const { contextData } = useMenuContext();
    const { executeDirectly } = useMenuContextHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddTask })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>
        </>
    );
}
