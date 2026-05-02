/**
 * Tab Bar Menu Helper Hook
 * Business logic for tab context menu operations
 * Handles pin/unpin, close all, and close all but pinned operations
 */

import { useEditorTabBarStore } from "../store/EditorTab.store";
import { useEditorTabBarHelper } from "@/shell";
import { useMenuContext, useMenuContextHelper } from "@/shared";
import { moduleRegistry } from "../moduleRegistry";
import { savePinnedStateToStorage, sortByPinnedFirst, isGroupChild } from "../utils/tabBar.utils";

export const useTabBarMenuHelper = () => {
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const { closeTabs } = useEditorTabBarHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    const contextTabId = contextData?.tabId || null;
    const contextTab = openTabs.find((tab) => tab.id === contextTabId);
    const isPinned = contextTab?.isPinned || false;
    const isChild = contextTab ? isGroupChild(contextTab, openTabs) : false;

    /**
     * Pin the context tab (and its group children if it's a group leader).
     */
    const pinTab = () => {
        if (!contextTabId) return;

        const groupLink = contextTab ? moduleRegistry.getTabGroupKey(contextTab) : null;

        const updated = openTabs.map((tab) => {
            if (tab.id === contextTabId) return { ...tab, isPinned: true };
            if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: true };
            return tab;
        });

        const newTabs = sortByPinnedFirst(updated);
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

        const updated = openTabs.map((tab) => {
            if (tab.id === contextTabId) return { ...tab, isPinned: false };
            if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: false };
            return tab;
        });

        const newTabs = sortByPinnedFirst(updated);
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
