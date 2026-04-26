/**
 * Navigation Keyboard Shortcuts
 * Global keyboard listener for Alt + Arrow navigation
 * Implements VS Code-style back/forward navigation
 */

import { useEffect } from "react";
import { useNavigationHistoryHelper } from "@/shell/hooks/useNavigationHistory.helper";
import {useEditorTabsStore, useNavigationHistoryStore} from "@/store/index";

export const NavigationKeyboardShortcuts = () => {
    const { handleGoBack, handleGoForward, canGoBack, canGoForward } = useNavigationHistoryHelper();
    const { past, future } = useNavigationHistoryStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            //* HISTORICAL NAVIGATION
            // Alt + Left Arrow - Navigate Back
            if (e.altKey && e.key === "ArrowLeft") {
                e.preventDefault();
                e.stopPropagation();
                if (past.length > 0) {
                    handleGoBack();
                }
            }

            // Alt + Right Arrow - Navigate Forward
            if (e.altKey && e.key === "ArrowRight") {
                e.preventDefault();
                e.stopPropagation();
                if (future.length > 0) {
                    handleGoForward();
                }
            }

            //* TAB NAVIGATION
            // Alt + Left Arrow - Previous Tab
            // if (e.shiftKey && e.key === "ArrowLeft") {
            //     e.preventDefault();
            //     if (openTabs.length > 0 && activeTabId) {
            //         const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
            //         if (currentIndex > 0) {
            //             setNewTabAnd(openTabs[currentIndex - 1].id);
            //         }
            //         else {
            //             setNewTabAnd(openTabs[openTabs.length - 1].id);
            //         }

            //     }
            // }

            // Alt + Right Arrow - Next Tab
            // if (e.shiftKey && e.key === "ArrowRight") {
            //     e.preventDefault();
            //     if (openTabs.length > 0 && activeTabId) {
            //         const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
            //         if (currentIndex < openTabs.length - 1) {
            //             setNewTabAnd(openTabs[currentIndex + 1].id);
            //         }
            //         else {
            //             setNewTabAnd(openTabs[0].id);
            //         }
            //     }
            // }
        };

        // CRITICAL: Use capture phase to intercept events BEFORE Monaco Editor
        // This allows navigation shortcuts to work even when editor is focused (VS Code behavior)
        window.addEventListener("keydown", handleKeyDown, { capture: true });

        // Cleanup on unmount
        return () => {
            window.removeEventListener("keydown", handleKeyDown, { capture: true });
        };
    }, []);

    // This component doesn't render anything
    return null;
};
