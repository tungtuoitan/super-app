/**
 * Markdown Editor Navigation Tracker
 * Tracks cursor position changes in Monaco Editor and updates navigation history
 * Implements VS Code-style navigation behavior:
 * - Only tracks position changes >10 lines apart
 * - Debounces to avoid excessive history entries
 * - Restores position when navigating back/forward
 */

import { useEffect, useRef } from "react";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
import { useNavigationHistoryHelper } from "@/shell/hooks/useNavigationHistory.helper";
import { useNavigationHistoryStore } from "@/store/index";
import { EDITOR_LINE_DISTANCE_THRESHOLD } from "@/shell/hooks/useNavigationHistory.helper";

export function MarkdownEditorNavigationTracker() {
    const { editorRef } = useNoteDetailStore();
    const { isNavigating } = useNavigationHistoryHelper();
    const { present, setTriggerSave } = useNavigationHistoryStore();

    // Track last recorded position to implement threshold logic
    const lastPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Listen to cursor position changes and track when moved significantly
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        // Listen to cursor position changes
        const disposable = editor.onDidChangeCursorPosition((e) => {
            // Don't track if we're currently navigating (to prevent tracking during restore)
            if (isNavigating()) {
                console.log("skipping tracking");
                return;
            }

            const currentPosition = e.position;

            // If no last position, set it and skip (first time)
            // if (!lastPosition) {
            //     lastPositionRef.current = {
            //         lineNumber: currentPosition.lineNumber,
            //         column: currentPosition.column,
            //     };
            //     // console.log(">>>>>>>>>>> [NAVIGATION] Initial position set", lastPositionRef.current);
            //     // return;
            // }

            // Calculate line distance
            const lineDistance = Math.abs(currentPosition.lineNumber - (lastPositionRef.current ? lastPositionRef.current.lineNumber : 0));

            // Only track if moved >5 lines (VS Code threshold)
            if (lineDistance > EDITOR_LINE_DISTANCE_THRESHOLD || lastPositionRef.current===null) {
                setTriggerSave(Date.now());
                // Debounce to avoid excessive tracking
                // if (debounceTimerRef.current) {
                //     clearTimeout(debounceTimerRef.current);
                // }

                // debounceTimerRef.current = setTimeout(() => {
                //     const mdPos = captureEditorPosition(editor);

                //     if (mdPos) {
                //         // Trigger save to update navigation history via TrackTabNavigation

                //         // Update last tracked position
                //         lastPositionRef.current = {
                //             lineNumber: mdPos.lineNumber,
                //             column: mdPos.column,
                //         };
                //     }
                // }, 500); // 500ms debounce
            }
        });

        return () => {
            disposable.dispose();
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Restore editor position when navigating (present changes)
    // useEffect(() => {
    //     const editor = editorRef.current;

    //     if (!editor || (editor as any)._isDisposed || !present) {
    //         return;
    //     }

    //     // Only restore if we just navigated (not during normal tracking)
    //     if (isNavigating() && present.mdPos) {
    //         // Small delay to ensure editor content is loaded
    //         setTimeout(() => {
    //             restoreEditorPosition(editor, present.mdPos, present.mdScrollPos);

    //             // Update last tracked position to prevent immediate re-tracking
    //             lastPositionRef.current = present.mdPos
    //                 ? {
    //                     lineNumber: present.mdPos.lineNumber,
    //                     column: present.mdPos.column,
    //                 }
    //                 : null;
    //         }, 100);
    //     }
    // }, [present]);

    return null;
}
