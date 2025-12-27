/**
 * Navigation Keyboard Shortcuts
 * Global keyboard listener for Alt + Arrow navigation
 * Implements VS Code-style back/forward navigation
 */

import { useEffect } from "react";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";

export const NavigationKeyboardShortcuts = () => {
    const { handleGoBack, handleGoForward, canGoBack, canGoForward } = useNavigationHistoryHelper();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt + Left Arrow - Navigate Back
            if (e.altKey && e.key === "ArrowLeft") {
                e.preventDefault();
                if (canGoBack()) {
                    handleGoBack();
                }
            }

            // Alt + Right Arrow - Navigate Forward
            if (e.altKey && e.key === "ArrowRight") {
                e.preventDefault();
                if (canGoForward()) {
                    handleGoForward();
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
