import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, RotateCcw as RestoreIcon, GitBranch as SubTaskIcon } from "lucide-react";
import { useMenuContext } from "@/shared";

export function TaskGridMenu() {
    const { contextData, openConfirmDialog, executeDirectly } = useMenuContext();

    const taskGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempTasks = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;
    const anySelectedDeleted =
        contextData?.selectedTasks?.some((t: any) => t.deletedAt !== null && t.deletedAt !== undefined) ?? false;

    const hoveredTask = contextData?.hoveredTask;
    const canAddSubTask = hoveredTask && hoveredTask.id > 0 && !hoveredTask.deletedAt;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddTask! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Task
            </MenuItem>

            {canAddSubTask && (
                <MenuItem onClick={() => executeDirectly({ callback: () => contextData?.onAddSubTask?.(hoveredTask.id) })}>
                    <SubTaskIcon className="w-4 h-4 mr-2" />
                    Add Subtask
                </MenuItem>
            )}

            <MenuDivider />

            {!anySelectedDeleted && taskGridSelectedCount > 0 && (
                <MenuItem
                    onClick={(e) => openConfirmDialog({ type: "soft-delete", entityType: "task", count: taskGridSelectedCount, allAreTempItems: allSelectedAreTempTasks, onConfirm: contextData?.onSoftDelete!, event: e })}
                >
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {anySelectedDeleted && !allSelectedAreTempTasks && (
                <MenuItem onClick={() => executeDirectly({ callback: contextData?.onRestore! })}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            )}
        </>
    );
}
