/**
 * Task Grid Menu Helper — Pattern B
 * Reads typed contextData; calls useTaskGridHelper directly.
 * No callbacks stored in contextData.
 */

import { useMenuContext, useMenuContextHelper } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";
import { getGenericConfirmMessage } from "@/shared";
import type { TaskGridMenuData } from "@/shared";
import { useTaskGridHelper } from "../../hooks/taskList/useTaskGrid.helper";

export const useTaskGridMenuHelper = () => {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { createNewTask, createSubTask, deleteRestoreTasks } = useTaskGridHelper();

    const data = contextData as TaskGridMenuData | null;
    const selectedIds   = data?.selectedIds   ?? [];
    const selectedTasks = data?.selectedTasks ?? [];
    const hoveredTask   = data?.hoveredTask   ?? null;
    const projectId     = data?.projectId;
    const onTaskCreated = data?.onTaskCreated;
    const onAddTask     = data?.onAddTask;

    const selectedCount       = selectedIds.length;
    const allAreTempTasks     = selectedCount > 0 && selectedIds.every((id) => id < 0);
    const anySelectedDeleted  = selectedTasks.some(
        (t) => t.deletedAt !== null && t.deletedAt !== undefined,
    );
    const canAddSubTask = hoveredTask && hoveredTask.id > 0 && !hoveredTask.deletedAt;

    const addTask = () => {
        setIsMenuContextOpen(false);
        if (onAddTask) {
            onAddTask();
            return;
        }
        if (!projectId) {
            return;
        }
        const newTask = createNewTask(projectId);
        if (newTask && onTaskCreated) onTaskCreated(newTask);
    };

    const addSubTask = () => {
        setIsMenuContextOpen(false);
        if (!hoveredTask || !projectId) return;

        // Smart parent: if hoveredTask is a subtask, use its parent; otherwise use itself
        const parentId = hoveredTask.parentTaskId ?? hoveredTask.id;
        if (parentId > 0) {
            const newSubTask = createSubTask(projectId, parentId);
            if (newSubTask && onTaskCreated) onTaskCreated(newSubTask);
        }
    };

    const softDelete = (anchorEl: HTMLElement | null) => {
        setIsMenuContextOpen(false);
        if (allAreTempTasks) {
            deleteRestoreTasks(selectedIds, "soft-delete", projectId);
            return;
        }
        const msg = getGenericConfirmMessage({
            type: "soft-delete",
            entityType: "task",
            count: selectedCount,
            isMultiple: selectedCount > 1,
        });
        showConfirmation({
            anchorEl,
            title: msg.title,
            subtitle: msg.subtitle,
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => deleteRestoreTasks(selectedIds, "soft-delete", projectId),
        });
    };

    const restore = () => {
        setIsMenuContextOpen(false);
        deleteRestoreTasks(selectedIds, "restore", projectId);
    };

    return {
        selectedCount,
        allAreTempTasks,
        anySelectedDeleted,
        canAddSubTask,
        addTask,
        addSubTask,
        softDelete,
        restore,
    };
};
