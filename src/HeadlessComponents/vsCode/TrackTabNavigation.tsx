import React, { useEffect, useRef } from "react";
import { useEditorTabsStore, useNavigationHistoryStore } from "@/store/index";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";

/**
 * VSEditorArea - Main editor area for note content
 *
 * Content:
 * - Note detail view when a note is selected
 * - Welcome/empty state when no note is selected
 */
export function TrackTabNavigation() {
    const { activeTabId } = useEditorTabsStore();
    const { trackNavigation, isNavigating, captureEditorPosition, captureEditorScrollPosition } = useNavigationHistoryHelper();
    const { editorRef } = useNoteDetailStore();
    const { triggerSave } = useNavigationHistoryStore();

    // Track navigation when active tab changes (but not during go back/forward)
    useEffect(() => {
        if (activeTabId && !isNavigating()) {
            // Delay to ensure editor is mounted and ready
            const timer = setTimeout(() => {
                // Double-check we're still not navigating
                if (!isNavigating()) {
                    // CRITICAL: Only capture if editor is mounted and available
                    // Otherwise mdPos will be undefined
                    const editor = editorRef.current;
                    if (!editor || (editor as any)._isDisposed) {
                        // Editor not ready yet, track without position data
                        // This entry will be updated later when MarkdownEditorNavigationTracker tracks with position
                        trackNavigation({});
                        return;
                    }

                    // Capture editor position and scroll if editor is available
                    const mdPos = captureEditorPosition(editor);
                    const mdScrollPos = captureEditorScrollPosition(editor);

                    trackNavigation({ mdPos, mdScrollPos });
                }
            }, 250); // Increased delay to ensure editor is mounted
            return () => clearTimeout(timer);
        }
    }, [activeTabId,triggerSave]);


    return null
}
