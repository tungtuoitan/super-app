import { useCurrentProjectStore } from "@/store/useCurrentProject.store";
/**
 * Task Tab Helper
 * Helper functions for managing task editor tabs
 */

import { Task, useTaskStore } from "../store/useTask.store";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabBarStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";

export const useTaskTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabBarStore();
    const { updateActiveTab, setNewTabAnd } = useEditorTabHelper();
    const { projects } = useCurrentProjectStore();
    const { tasks } = useTaskStore();

    /**
     * Open task in editor tab (within TabBar of ProjectDetailContent)
     * If tab already exists, activate it; otherwise create new tab
     */
    const openTaskTab = (task: Task, openedBy?: { link: string; label: string }) => {
        // Check if tab already exists for this task
        const existingTab = openTabs.find(
            (tab) => tab.type === constants.vscode.tab.tabTypes.task && (tab.data as Task).id === task.id
        );

        if (existingTab) {
            updateActiveTab(existingTab.id);
        } else {
            // Derive openedBy from real names in store
            const resolvedOpenedBy = openedBy ?? (() => {
                if (task.parentTaskId) {
                    const parent = tasks.find(t => t.id === task.parentTaskId);
                    return { link: `sa/p${task.projectId}/t${task.parentTaskId}`, label: parent?.title ?? "Parent Task" };
                }
                const project = projects.find(p => p.id === task.projectId);
                return { link: `sa/p${task.projectId}`, label: project?.name ?? "Project" };
            })();

            const newTab: BaseTab = {
                id: `task-tab-${task.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.task,
                data: task,
                data0: task,
                title: task.title || constants.vscode.tabTitles.unsavedTask,
                hasUnsavedChanges: false,
                openedBy: resolvedOpenedBy,
            };

            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            updateActiveTab(newTab.id, newTabs);
        }
    };

    /**
     * Close task tab
     */
    const closeTaskTab = (tabId: string) => {
        setOpenTabs((prev) => {
            const newTabs = prev.filter((t) => t.id !== tabId);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Switch to the last tab
                    const lastTab = newTabs[newTabs.length - 1];
                    setNewTabAnd(lastTab.id);
                } else {
                    setNewTabAnd(null);
                }
            }

            return newTabs;
        });
    };

    /**
     * Update task in all tabs
     * When task is updated, sync it across all open tabs
     */
    const updateTaskInTabs = (taskId: number, updatedTask: Partial<Task>) => {
        setOpenTabs((prev) =>
            prev.map((tab) => {
                if (tab.type === constants.vscode.tab.tabTypes.task && (tab.data as Task).id === taskId) {
                    const taskData = tab.data as Task;
                    return {
                        ...tab,
                        data: { ...taskData, ...updatedTask },
                        title: updatedTask.title || tab.title,
                    };
                }
                return tab;
            })
        );
    };

    return {
        openTaskTab,
        closeTaskTab,
        updateTaskInTabs,
    };
};
