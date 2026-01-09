/**
 * Navigation Keyboard Shortcuts
 * Global keyboard listener for Alt + Arrow navigation
 * Implements VS Code-style back/forward navigation
 */

import { useEffect } from "react";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";
import {useEditorTabsStore} from "@/store/index";
import {useEditorTabHelper} from "@/hooks/index";

export const NavigationKeyboardShortcuts = () => {
    const { handleGoBack, handleGoForward, canGoBack, canGoForward } = useNavigationHistoryHelper();
    const { openTabs, activeTabId, setActiveTabId } = useEditorTabsStore();
    const { setNewTabAnd } = useEditorTabHelper();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            //* HISTORICAL NAVIGATION - DISABLED FOR NOW
            // Alt + Left Arrow - Navigate Back
            // if (e.altKey && e.key === "ArrowLeft") {
            //     e.preventDefault();
            //     if (canGoBack()) {
            //         handleGoBack();
            //     }
            // }

            // // Alt + Right Arrow - Navigate Forward
            // if (e.altKey && e.key === "ArrowRight") {
            //     e.preventDefault();
            //     if (canGoForward()) {
            //         handleGoForward();
            //     }
            // }
            if (e.altKey && e.key === "ArrowLeft") {
                e.preventDefault();
                if (openTabs.length > 0 && activeTabId) {
                    const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
                    if (currentIndex > 0) {
                        setNewTabAnd(openTabs[currentIndex - 1].id);
                    }
                    else {
                        setNewTabAnd(openTabs[openTabs.length - 1].id);
                    }
                
                }
            }

            // Alt + Right Arrow - Next Tab
            if (e.altKey && e.key === "ArrowRight") {
                e.preventDefault();
                if (openTabs.length > 0 && activeTabId) {
                    const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
                    if (currentIndex < openTabs.length - 1) {
                        setNewTabAnd(openTabs[currentIndex + 1].id);
                    }
                    else {
                        setNewTabAnd(openTabs[0].id);
                    }
                }
            }
        };

        // Add global keyboard listener
        window.addEventListener("keydown", handleKeyDown);

        // Cleanup on unmount
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleGoBack, handleGoForward, canGoBack, canGoForward]);

    // This component doesn't render anything
    return null;
};
