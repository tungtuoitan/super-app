/**
 * Tab Bar Menu Helper Hook
 * Business logic for tab context menu operations
 * Handles pin/unpin, close all, and close all but pinned operations
 */

import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";

export const useTabBarMenuHelper = () => {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { closeTabs } = useEditorTabHelper();
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();

    // Get the context tab ID from the context menu store
    const contextTabId = contextData?.tabId || null;

    // Get the context tab (the tab that was right-clicked)
    const contextTab = openTabs.find((tab) => tab.id === contextTabId);
    const isPinned = contextTab?.isPinned || false;

    /**
     * Pin the context tab
     */
    const pinTab = () => {
        if (!contextTabId) return;

        setOpenTabs((prevTabs) =>
            prevTabs.map((tab) => (tab.id === contextTabId ? { ...tab, isPinned: true } : tab))
        );
        setIsContextMenuOpen(false);
    };

    /**
     * Unpin the context tab
     */
    const unpinTab = () => {
        if (!contextTabId) return;

        setOpenTabs((prevTabs) =>
            prevTabs.map((tab) => (tab.id === contextTabId ? { ...tab, isPinned: false } : tab))
        );
        setIsContextMenuOpen(false);
    };

    /**
     * Close all saved tabs
     */
    const closeAllSavedTabs = () => {
        const savedTabs = openTabs.filter((tab) => !tab.hasUnsavedChanges);
        const tabIds = savedTabs.map((tab) => tab.id);
        closeTabs(tabIds);
        setIsContextMenuOpen(false);
    };

    /**
     * Close all saved tabs except pinned ones
     */
    const closeSavedTabsButPinned = () => {
        const savedTabs = openTabs.filter((tab) => !tab.hasUnsavedChanges && !tab.isPinned);
        const tabIds = savedTabs.map((tab) => tab.id);
        closeTabs(tabIds);
        setIsContextMenuOpen(false);
    };

    return {
        contextTabId,
        isPinned,
        pinTab,
        unpinTab,
        closeAllSavedTabs,
        closeSavedTabsButPinned,
    };
};
