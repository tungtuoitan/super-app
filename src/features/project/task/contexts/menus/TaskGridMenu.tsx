import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, RotateCcw as RestoreIcon, GitBranch as SubTaskIcon } from "lucide-react";
import { useTaskGridMenuHelper } from "../helpers/useTaskGridMenu.helper";

export function TaskGridMenu() {
    const { selectedCount, allAreTempTasks, anySelectedDeleted, canAddSubTask, addTask, addSubTask, softDelete, restore } = useTaskGridMenuHelper();

    return (
        <>
            <MenuItem onClick={addTask}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>

            {canAddSubTask && (
                <MenuItem onClick={addSubTask}>
                    <SubTaskIcon className="w-4 h-4 mr-2" />
                    Add Subtask
                </MenuItem>
            )}

            <MenuDivider />

            {!anySelectedDeleted && selectedCount > 0 && (
                <MenuItem onClick={(e: any) => softDelete((e.syntheticEvent?.target ?? e.target) as HTMLElement)}>
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {anySelectedDeleted && !allAreTempTasks && (
                <MenuItem onClick={restore}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            )}
        </>
    );
}
