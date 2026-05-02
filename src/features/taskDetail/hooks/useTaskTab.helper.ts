/**
 * Task Tab Helper
 * Helper functions for managing task editor tabs.
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import type { Task } from "../types/task.types";
import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import { usePTaskStore } from "@/features/project";
import { useTaskDetailStore } from "../store/useTaskDetail.store";

const TAB_TYPE = shellConstants.vscode.tab.tabTypes.task;

export const useTaskTabHelper = () => {
    const { openTab, closeTab, updateTabData } = useEditorTabBarHelper();
    const { allProjects } = useTaskDetailStore();
    const { tasks } = usePTaskStore();

    const resolveOpenedBy = (task: Task) => {
        if (task.parentTaskId) {
            const parent = tasks.find((t) => t.id === task.parentTaskId);
            return {
                link: `sa/p${task.projectId}/t${task.parentTaskId}`,
                label: parent?.title ?? "Parent Task",
            };
        }
        const project = allProjects.find((p) => p.id === task.projectId);
        return {
            link: `sa/p${task.projectId}`,
            label: project?.name ?? "Project",
        };
    };

    /**
     * Open task in editor tab.
     * If tab already exists → activate it. Otherwise → create new tab.
     */
    const openTaskTab = (task: Task, openedBy?: { link: string; label: string }) => {
        openTab(task, TAB_TYPE, {
            title: task.title || shellConstants.vscode.tabTitles.unsavedTask,
            openedBy: openedBy ?? resolveOpenedBy(task),
        });
    };

    /**
     * Close task tab — fires onTabClose module callbacks via shell.
     */
    const closeTaskTab = (tabId: string) => {
        closeTab(tabId);
    };

    /**
     * Sync updated task data into any open tabs showing this task.
     * Merges the patch into the existing tab data so no fields are lost.
     */
    const updateTaskInTabs = (taskId: number, updatedTask: Partial<Task>) => {
        updateTabData(
            TAB_TYPE,
            taskId,
            (current: Task) => ({ ...(current as Task), ...updatedTask }),
            updatedTask.title,
        );
    };

    return { openTaskTab, closeTaskTab, updateTaskInTabs };
};
