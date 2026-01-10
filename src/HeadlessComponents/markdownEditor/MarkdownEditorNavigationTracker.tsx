/**
 * Markdown Editor Navigation Tracker
 * Tracks cursor position changes in Monaco Editor and updates navigation history
 * Implements VS Code-style navigation behavior:
 * - Only tracks position changes >10 lines apart
 * - Debounces to avoid excessive history entries
 * - Restores position when navigating back/forward
 */

import { useEffect, useRef } from "react";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";
import { useNavigationHistoryStore } from "@/store/index";
import { EDITOR_LINE_DISTANCE_THRESHOLD } from "@/hooks/vsCode/useNavigationHistory.helper";

export function MarkdownEditorNavigationTracker() {
    const { editorRef } = useNoteDetailStore();
    const { trackNavigation, captureEditorPosition, restoreEditorPosition, isNavigating, getCurrentEntry } = useNavigationHistoryHelper();
    const { present } = useNavigationHistoryStore();

    // Track last recorded position to implement threshold logic
    const lastTrackedPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);

    // Debounce timer
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
            if (isNavigating()) return;

            const currentPosition = e.position;
            const lastPosition = lastTrackedPositionRef.current;

            // If no last position, set it and skip (first time)
            if (!lastPosition) {
                lastTrackedPositionRef.current = {
                    lineNumber: currentPosition.lineNumber,
                    column: currentPosition.column,
                };
                return;
            }

            // Calculate line distance
            const lineDistance = Math.abs(currentPosition.lineNumber - lastPosition.lineNumber);

            // Only track if moved >10 lines (VS Code threshold)
            if (lineDistance > EDITOR_LINE_DISTANCE_THRESHOLD) {
                // Debounce to avoid excessive tracking
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }

                debounceTimerRef.current = setTimeout(() => {
                    const editorPosition = captureEditorPosition(editor);

                    if (editorPosition) {
                        trackNavigation({ editorPosition });

                        // Update last tracked position
                        lastTrackedPositionRef.current = {
                            lineNumber: editorPosition.lineNumber,
                            column: editorPosition.column,
                        };
                    }
                }, 500); // 500ms debounce
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
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor || (editor as any)._isDisposed || !present) {
            return;
        }

        // Only restore if we just navigated (not during normal tracking)
        if (isNavigating() && present.editorPosition) {
            // Small delay to ensure editor content is loaded
            setTimeout(() => {
                restoreEditorPosition(editor, present.editorPosition);

                // Update last tracked position to prevent immediate re-tracking
                lastTrackedPositionRef.current = present.editorPosition
                    ? {
                        lineNumber: present.editorPosition.lineNumber,
                        column: present.editorPosition.column,
                    }
                    : null;
            }, 100);
        }
    }, [present]);

    return null;
}
