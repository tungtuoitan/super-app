/**
 * Markdown Editor ViewState Sync
 * Syncs Monaco editor scroll + cursor position with tab ViewState
 * - Saves editor position when switching away from tab
 * - Restores editor position when switching to tab
 */

import { useEffect, useRef } from "react";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
import { useEditorTabsStore } from "@/shell/store/EditorTab.store";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { constants } from "@/utils/constants";
import type * as _monaco from "monaco-editor";

export function useMarkdownEditorViewStateSync() {
    const { editorRef, editorMountCount,isMounted } = useNoteDetailStore();
    const { activeTabId, setOpenTabs } = useEditorTabsStore();
    const { isLoadingTab, setIsLoadingTab } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    

    // Track previous active tab to save state when switching
    const prevActiveTabIdRef = useRef<string | null>(null);

    // Track if we're currently restoring (to prevent saving during restore)
    const isRestoringRef = useRef(false);

    // Save editor position when switching away from tab
    useEffect(() => {
        if(!isMounted) {
            return;
        }
        const editor = editorRef.current;
        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        const prevTabId = prevActiveTabIdRef.current;

        // If switching tabs (prevTabId exists and different from current)
        if (prevTabId && prevTabId !== activeTabId) {
            // Save previous tab's editor state
            try {
                const position = editor.getPosition();
                const scrollTop = editor.getScrollTop();
                const scrollLeft = editor.getScrollLeft();

                setOpenTabs((prev) =>
                    prev.map((tab) =>
                        tab.id === prevTabId
                            ? {
                                  ...tab,
                                  viewState: {
                                      ...tab.viewState,
                                      editorPosition: position
                                          ? {
                                                lineNumber: position.lineNumber,
                                                column: position.column,
                                            }
                                          : undefined,
                                      editorScrollPosition: {
                                          scrollTop,
                                          scrollLeft,
                                      },
                                  },
                              }
                            : tab
                    )
                );
            } catch (error) {
                console.warn("[ViewState] Failed to save editor position:", error);
            }
        }

        // Update prev tab ID
        prevActiveTabIdRef.current = activeTabId;
    }, [activeTabId]);

    // Restore editor position when tab becomes active
    useEffect(() => {
        const editor = editorRef.current;
        const activeTab = getActiveTab();

        if (!editor || (editor as any)._isDisposed || !activeTab) {
            return;
        }

        // Only restore for note tabs
        if (activeTab.type !== constants.vscode.tab.tabTypes.note) {
            return;
        }

        const viewState = activeTab.viewState;
        if (!viewState) {
            return;
        }

        // Set loading to show overlay
        setIsLoadingTab(true);

        // Set restoring flag
        isRestoringRef.current = true;

        // Small delay to ensure MarkdownEditorSync has run (setValue) first
        // MarkdownEditorSync runs when displayDesc changes (from activeNote.description)
        // We need to restore AFTER setValue to avoid being overwritten
        const restoreTimer = setTimeout(() => {
            try {
                // Only restore scroll position (no cursor/focus)
                if (viewState.editorScrollPosition) {
                    // console.log("activeTabId.scroll position:", activeTab.title, viewState.editorScrollPosition);
                    editor.setScrollPosition(
                        {
                            scrollTop: viewState.editorScrollPosition.scrollTop,
                            scrollLeft: viewState.editorScrollPosition.scrollLeft,
                        },
                        1 // ScrollType.Immediate - no animation
                    );
                }

                // Hide loading and clear restoring flag
                setIsLoadingTab(false);
                isRestoringRef.current = false;
            } catch (error) {
                console.warn("[ViewState] Failed to restore scroll position:", error);
                setIsLoadingTab(false);
                isRestoringRef.current = false;
            }
        }, 50); // Small delay to ensure MarkdownEditorSync runs first

        return () => clearTimeout(restoreTimer);
    }, [activeTabId]);

    // Restore when editor is freshly mounted from a non-note tab (editorMountCount changes).
    // For note→note switches, MarkdownEditorSync restores scroll directly after setValue.
    // At this point editorRef.current is the new instance but layout hasn't run yet → need one rAF
    useEffect(() => {
        if (editorMountCount === 0) return; // skip initial render

        const editor = editorRef.current;
        const activeTab = getActiveTab();

        if (!editor || (editor as any)._isDisposed || !activeTab) return;
        if (activeTab.type !== constants.vscode.tab.tabTypes.note) return;

        const scrollToRestore = activeTab.viewState?.editorScrollPosition;
        // console.log("editor mounted, restoring scroll:", activeTab.title,scrollToRestore);
        if (!scrollToRestore || (scrollToRestore.scrollTop === 0 && scrollToRestore.scrollLeft === 0)) return;
        setIsLoadingTab(true)
        
        isRestoringRef.current = true;
        requestAnimationFrame(() => {
            if (editor && !(editor as any)._isDisposed) {
                editor.setScrollPosition(
                    { scrollTop: scrollToRestore.scrollTop, scrollLeft: scrollToRestore.scrollLeft },
                    1
                );
            }
            isRestoringRef.current = false;
            setIsLoadingTab(false);
        });
    }, [editorMountCount]);

    // Also save position periodically when user scrolls/moves cursor
    useEffect(() => {
        const editor = editorRef.current;
        const activeTab = getActiveTab();

        if (!editor || (editor as any)._isDisposed || !activeTab) {
            return;
        }

        // Save on scroll
        const scrollDisposable = editor.onDidScrollChange(() => {
            if (isRestoringRef.current) return;

            try {
                const scrollTop = editor.getScrollTop();
                const scrollLeft = editor.getScrollLeft();
                // console.log("save position:", activeTab.title, scrollTop);

                setOpenTabs((prev) =>
                    prev.map((tab) =>
                        tab.id === activeTab.id
                            ? {
                                  ...tab,
                                  viewState: {
                                      ...tab.viewState,
                                      editorScrollPosition: {
                                          scrollTop,
                                          scrollLeft,
                                      },
                                  },
                              }
                            : tab
                    )
                );
            } catch (error) {
                // Silently ignore errors
            }
        });

        // No need to save cursor position anymore

        return () => {
            scrollDisposable.dispose();
        };
    }, [activeTabId,editorMountCount]);

    return null;
}
