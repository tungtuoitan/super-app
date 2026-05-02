/**
 * Tab Bar Menu Helper Hook
 * Business logic for tab context menu operations
 * Handles pin/unpin, close all, and close all but pinned operations
 */

import { useEditorTabBarStore } from "../store/EditorTab.store";
import { useEditorTabBarHelper } from "@/shell";
import { useMenuContext, useMenuContextHelper } from "@/shared";
import type { BaseTab } from "@/shell";
import { shellConstants } from "../shell.constants";
import { moduleRegistry } from "../moduleRegistry";

/** Returns true if this tab is a child of a tab group (its openedBy.link matches a leader's group key) */
const isGroupChild = (tab: BaseTab, allTabs: BaseTab[]): boolean => {
    const link = tab.openedBy?.link;
    if (!link) return false;
    return allTabs.some((t) => moduleRegistry.getTabGroupKey(t) === link);
};

export const useTabBarMenuHelper = () => {
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const { closeTabs } = useEditorTabBarHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    const contextTabId = contextData?.tabId || null;
    const contextTab = openTabs.find((tab) => tab.id === contextTabId);
    const isPinned = contextTab?.isPinned || false;
    const isChild = contextTab ? isGroupChild(contextTab, openTabs) : false;

    const savePinnedStateToStorage = (tabs: typeof openTabs) => {
        const pinnedState: Record<string, boolean> = {};
        tabs.forEach((tab) => { pinnedState[tab.id] = !!tab.isPinned; });
        localStorage.setItem(shellConstants.storage.tabPinnedState, JSON.stringify(pinnedState));
    };

    /**
     * Pin the context tab (and its group children if it's a group leader).
     */
    const pinTab = () => {
        if (!contextTabId) return;

        const groupLink = contextTab ? moduleRegistry.getTabGroupKey(contextTab) : null;

        const newTabs = openTabs.map((tab) => {
            if (tab.id === contextTabId) return { ...tab, isPinned: true };
            if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: true };
            return tab;
        });

        newTabs.sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0));

        setOpenTabs(newTabs);
        savePinnedStateToStorage(newTabs);
        setIsMenuContextOpen(false);
    };

    /**
     * Unpin the context tab (and its group children if it's a group leader).
     */
    const unpinTab = () => {
        if (!contextTabId) return;

        const groupLink = contextTab ? moduleRegistry.getTabGroupKey(contextTab) : null;

        const newTabs = openTabs.map((tab) => {
            if (tab.id === contextTabId) return { ...tab, isPinned: false };
            if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: false };
            return tab;
        });

        newTabs.sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0));

        setOpenTabs(newTabs);
        savePinnedStateToStorage(newTabs);
        setIsMenuContextOpen(false);
    };

    const closeAllSavedTabs = () => {
        const tabIds = openTabs.filter((tab) => !tab.hasUnsavedChanges).map((tab) => tab.id);
        closeTabs(tabIds);
        setIsMenuContextOpen(false);
    };

    const closeSavedTabsButPinned = () => {
        const tabIds = openTabs
            .filter((tab) => !tab.hasUnsavedChanges && !tab.isPinned)
            .map((tab) => tab.id);
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
