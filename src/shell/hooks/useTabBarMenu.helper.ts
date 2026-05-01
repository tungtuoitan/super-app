/**
 * Tab Bar Menu Helper Hook
 * Business logic for tab context menu operations
 * Handles pin/unpin, close all, and close all but pinned operations
 */

import { shellConstants, useEditorTabBarStore } from "@/shell";
import { useEditorTabHelper } from "@/shell";
import { useMenuContext, useMenuContextHelper } from "@/shared";
import { constants } from "@/shared";
import type { Task } from "@/features/taskDetail";
import type { BaseTab } from "@/shell";

/** Returns the task group link for a task tab, or null if not a task tab */
const getTaskGroupLink = (tab: BaseTab): string | null => {
    if (tab.type !== shellConstants.vscode.tab.tabTypes.task) return null;
    const task = tab.data as Task;
    return `sa/p${task.projectId}/t${task.id}`;
};

/** Returns true if this tab is a child of a task group (its openedBy.link points to a task tab) */
const isGroupChild = (tab: BaseTab, allTabs: BaseTab[]): boolean => {
    const link = tab.openedBy?.link;
    if (!link) return false;
    return allTabs.some((t) => getTaskGroupLink(t) === link);
};


export const useTabBarMenuHelper = () => {
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const { closeTabs } = useEditorTabHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    // Get the context tab ID from the context menu store
    const contextTabId = contextData?.tabId || null;

    // Get the context tab (the tab that was right-clicked)
    const contextTab = openTabs.find((tab) => tab.id === contextTabId);
    const isPinned = contextTab?.isPinned || false;

    // If right-clicked tab is a group child, hide pin/unpin
    const isChild = contextTab ? isGroupChild(contextTab, openTabs) : false;

    // Save pinned state to localStorage
    const savePinnedStateToStorage = (tabs: typeof openTabs) => {
        const pinnedState: Record<string, boolean> = {};
        tabs.forEach(tab => {
            pinnedState[tab.id] = !!tab.isPinned;
        });
        localStorage.setItem("tabPinnedState", JSON.stringify(pinnedState));
    };

    /**
     * Pin the context tab (and its group children if it's a task tab)
     */
    const pinTab = () => {
        if (!contextTabId) return;

        const groupLink = contextTab ? getTaskGroupLink(contextTab) : null;

        const newTabs = openTabs.map((tab) => {
            if (tab.id === contextTabId) return { ...tab, isPinned: true };
            // Also pin group children
            if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: true };
            return tab;
        });

        // Sort: pinned tabs first
        newTabs.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });

        setOpenTabs(newTabs);
        savePinnedStateToStorage(newTabs);
        setIsMenuContextOpen(false);
    };

    /**
     * Unpin the context tab (and its group children if it's a task tab)
     */
    const unpinTab = () => {
        if (!contextTabId) return;

        const groupLink = contextTab ? getTaskGroupLink(contextTab) : null;

        const newTabs = openTabs.map((tab) => {
            if (tab.id === contextTabId) return { ...tab, isPinned: false };
            // Also unpin group children
            if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: false };
            return tab;
        });

        // Sort: pinned tabs first
        newTabs.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });

        setOpenTabs(newTabs);
        savePinnedStateToStorage(newTabs);
        setIsMenuContextOpen(false);
    };

    /**
     * Close all saved tabs
     */
    const closeAllSavedTabs = () => {
        const savedTabs = openTabs.filter((tab) => !tab.hasUnsavedChanges);
        const tabIds = savedTabs.map((tab) => tab.id);
        closeTabs(tabIds);
        setIsMenuContextOpen(false);
    };

    /**
     * Close all saved tabs except pinned ones
     */
    const closeSavedTabsButPinned = () => {
        const savedTabs = openTabs.filter((tab) => !tab.hasUnsavedChanges && !tab.isPinned);
        const tabIds = savedTabs.map((tab) => tab.id);
        closeTabs(tabIds);
        setIsMenuContextOpen(false);
    };

    return {
        contextTabId,
        isPinned,
        isChild,
        pinTab,
        unpinTab,
        closeAllSavedTabs,
        closeSavedTabsButPinned,
    };
};

