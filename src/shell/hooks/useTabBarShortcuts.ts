/**
 * Tab Keyboard Shortcuts Hook
 * Handles VSCode-style keyboard shortcuts for tab operations.
 *
 * Built-in shortcuts (shell-generic):
 * - Ctrl+K Shift+Enter: Pin/Unpin active tab
 * - Ctrl+K W: Close all saved tabs
 *
 * Feature shortcuts are registered via moduleRegistry.useShortcuts
 * (e.g. Ctrl+L for new LifeLog entry — contributed by lifeLog module).
 */

import { useEffect, useRef } from "react";
import { useEditorTabBarStore } from "../store/EditorTab.store";
import { useEditorTabBarHelper } from "@/shell";
import { moduleRegistry } from "../moduleRegistry";

export const useTabBarShortcuts = () => {
    const { openTabs, setOpenTabs, activeTabId } = useEditorTabBarStore();
    const { closeTabs } = useEditorTabBarHelper();
    const ctrlKPressedRef = useRef(false);

    // Collect feature shortcuts from all registered modules
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const moduleShortcuts = moduleRegistry
        .getAll()
        .filter((m) => m.useShortcuts != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .flatMap((m) => m.useShortcuts!());

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isCtrlOrCmd = event.ctrlKey || event.metaKey;

            // Ctrl+K detection (first key in sequence)
            if (isCtrlOrCmd && event.key.toLowerCase() === "k") {
                event.preventDefault();
                ctrlKPressedRef.current = true;
                setTimeout(() => { ctrlKPressedRef.current = false; }, 1000);
                return;
            }

            // Ctrl+K Shift+Enter — Pin/Unpin active tab
            if (ctrlKPressedRef.current && event.shiftKey && event.key === "Enter") {
                event.preventDefault();
                ctrlKPressedRef.current = false;

                if (activeTabId) {
                    const activeTab = openTabs.find((t) => t.id === activeTabId);
                    if (!activeTab) return;

                    // Check if this tab is a group child (its openedBy.link matches a leader's group key)
                    const isChild = activeTab.openedBy?.link
                        ? openTabs.some((t) => moduleRegistry.getTabGroupKey(t) === activeTab.openedBy!.link)
                        : false;
                    if (isChild) return;

                    const newPinned = !activeTab.isPinned;
                    // If this tab is a group leader, pin/unpin its children too
                    const groupLink = moduleRegistry.getTabGroupKey(activeTab);

                    const newTabs = openTabs.map((tab) => {
                        if (tab.id === activeTabId) return { ...tab, isPinned: newPinned };
                        if (groupLink && tab.openedBy?.link === groupLink) return { ...tab, isPinned: newPinned };
                        return tab;
                    });

                    newTabs.sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0));
                    setOpenTabs(newTabs);

                    const pinnedState: Record<string, boolean> = {};
                    newTabs.forEach((tab) => { pinnedState[tab.id] = !!tab.isPinned; });
                    localStorage.setItem("tabPinnedState", JSON.stringify(pinnedState));
                }
                return;
            }

            // Ctrl+K W — Close all saved tabs
            if (ctrlKPressedRef.current && event.key === "w") {
                event.preventDefault();
                ctrlKPressedRef.current = false;
                closeTabs(openTabs.filter((tab) => !tab.hasUnsavedChanges).map((tab) => tab.id));
                return;
            }

            // Feature shortcuts (e.g. Ctrl+L for new log, registered via moduleRegistry)
            if (!ctrlKPressedRef.current) {
                const matched = moduleShortcuts.find((s) => {
                    if (s.ctrl && !isCtrlOrCmd) return false;
                    if (s.shift && !event.shiftKey) return false;
                    if (s.alt && !event.altKey) return false;
                    return event.key.toLowerCase() === s.key.toLowerCase();
                });
                if (matched) {
                    event.preventDefault();
                    matched.handler();
                    return;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [openTabs, activeTabId, moduleShortcuts]);
};
