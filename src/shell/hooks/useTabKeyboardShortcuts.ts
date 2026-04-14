/**
 * Tab Keyboard Shortcuts Hook
 * Handles VSCode-style keyboard shortcuts for tab operations
 *
 * Shortcuts:
 * - Ctrl+K Shift+Enter: Pin/Unpin active tab
 * - Ctrl+K W: Close all tabs
 */

import { useEffect, useRef } from "react";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useLifeLogTabHelper } from "@/features/lifeLog/hooks/useLifeLogTab.helper";
import { constants } from "@/utils/constants";
import type { Task } from "@/features/task/store/useTask.store";
import type { BaseTab } from "@/types/editor/tab.types";

export const useTabKeyboardShortcuts = () => {
    const { openTabs, setOpenTabs, activeTabId } = useEditorTabsStore();
    const { closeTabs } = useEditorTabHelper();
    const { openNewLogTab } = useLifeLogTabHelper();
    const ctrlKPressedRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isCtrlOrCmd = event.ctrlKey || event.metaKey;

            // Ctrl+K detection (first key in sequence)
            if (isCtrlOrCmd && event.key.toLowerCase() === "k") {
                event.preventDefault();
                ctrlKPressedRef.current = true;

                // Reset Ctrl+K state after 1 second if no follow-up key
                setTimeout(() => {
                    ctrlKPressedRef.current = false;
                }, 1000);
                return;
            }

            // Ctrl+K Shift+Enter - Pin/Unpin active tab
            if (ctrlKPressedRef.current && event.shiftKey && event.key === "Enter") {
                event.preventDefault();
                ctrlKPressedRef.current = false;

                if (activeTabId) {
                    const activeTab = openTabs.find((t) => t.id === activeTabId);
                    if (!activeTab) return;

                    // Block pin/unpin for group children
                    const isChild = activeTab.openedBy?.link
                        ? openTabs.some((t) => {
                              if (t.type !== constants.vscode.tab.tabTypes.task) return false;
                              const task = t.data as Task;
                              return `sa/p${task.projectId}/t${task.id}` === activeTab.openedBy!.link;
                          })
                        : false;
                    if (isChild) return;

                    const newPinned = !activeTab.isPinned;
                    // If task tab, also toggle children
                    const groupLink =
                        activeTab.type === constants.vscode.tab.tabTypes.task
                            ? `sa/p${(activeTab.data as Task).projectId}/t${(activeTab.data as Task).id}`
                            : null;

                    const newTabs = openTabs.map((tab) => {
                        if (tab.id === activeTabId) return { ...tab, isPinned: newPinned };
                        if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: newPinned };
                        return tab;
                    });

                    // Sort: pinned tabs first
                    newTabs.sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return 0;
                    });

                    setOpenTabs(newTabs);

                    // Save pinned state to localStorage
                    const pinnedState: Record<string, boolean> = {};
                    newTabs.forEach(tab => {
                        pinnedState[tab.id] = !!tab.isPinned;
                    });
                    localStorage.setItem("tabPinnedState", JSON.stringify(pinnedState));
                }
                return;
            }

            // Ctrl+K W - Close all saved tabs
            if (ctrlKPressedRef.current && event.key === "w") {
                event.preventDefault();
                ctrlKPressedRef.current = false;

                // Close all saved tabs
                const savedTabs = openTabs.filter((tab) => !tab.hasUnsavedChanges);
                const tabIds = savedTabs.map((tab) => tab.id);
                closeTabs(tabIds);
                return;
            }

            // Ctrl+L - Create new log
            if (isCtrlOrCmd && event.key.toLowerCase() === "l") {
                event.preventDefault();
                openNewLogTab();
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [openTabs, activeTabId, setOpenTabs, closeTabs, openNewLogTab]);
};
