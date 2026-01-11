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
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";

export const useTabKeyboardShortcuts = () => {
    const { openTabs, setOpenTabs, activeTabId } = useEditorTabsStore();
    const { closeTabs } = useEditorTabHelper();
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
                    setOpenTabs((prevTabs) =>
                        prevTabs.map((tab) => {
                            if (tab.id === activeTabId) {
                                return { ...tab, isPinned: !tab.isPinned };
                            }
                            return tab;
                        })
                    );
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
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [openTabs, activeTabId, setOpenTabs, closeTabs]);
};
