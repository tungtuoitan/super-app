import React from "react";
import { MenuItem } from "@szhsin/react-menu";
import { Plus as AddIcon } from "lucide-react";
import { useTaskFlowMenuHelper } from "@/features/multiProject";

export function TaskFlowMenu() {
    const { addTask } = useTaskFlowMenuHelper();

    return (
        <>
            <MenuItem onClick={addTask}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>
        </>
    );
}
