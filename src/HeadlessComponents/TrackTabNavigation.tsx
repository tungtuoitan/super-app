import React, { useEffect, useRef } from "react";
import { useEditorTabsStore } from "@/store/index";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";

/**
 * VSEditorArea - Main editor area for note content
 *
 * Content:
 * - Note detail view when a note is selected
 * - Welcome/empty state when no note is selected
 */
export function TrackTabNavigation() {
    const { activeTabId } = useEditorTabsStore();
    const { trackNavigation, isNavigating } = useNavigationHistoryHelper();

    // Track navigation when active tab changes (but not during go back/forward)
    useEffect(() => {
        if (activeTabId && !isNavigating()) {
            // Small delay to ensure DOM is updated
            const timer = setTimeout(() => {
                // Double-check we're still not navigating
                if (!isNavigating()) {
                    trackNavigation();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [activeTabId]);


    return null
}
