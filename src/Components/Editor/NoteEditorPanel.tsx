/**
 * Note Editor Panel
 * Reuses NoteDetailContent for editor area tabs
 * Toolbar is now shared in VSEditorArea
 */

import React, { useEffect, useRef, useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { NoteDetailContent } from "../Note/NoteDetailContent";

interface NoteEditorPanelProps {
    tab: BaseTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    const contentRef = useRef<HTMLDivElement>(null);
    const isRestoringScrollRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync hasUnsavedChanges with noteHasChanges
    //* khi tạo Panel mới thì thêm cái này vào.
    useEffect(() => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === tab.id
                    ? {
                          ...t,
                          hasUnsavedChanges: tab.data && tab.data0 ? JSON.stringify(tab.data) !== JSON.stringify(tab.data0) : false,
                      }
                    : t
            )
        );
    }, [tab.id, tab.data]);

    // Restore scroll position ONLY when switching tabs (tab.id changes)
    useEffect(() => {
        const currentTab = openTabs.find((t: BaseTab) => t.id === tab.id);
        const scrollTop = currentTab?.viewState?.scrollTop;

        if (contentRef.current && scrollTop !== undefined) {
            isRestoringScrollRef.current = true;
            contentRef.current.scrollTop = scrollTop;

            // Reset flag after scroll restoration completes
            requestAnimationFrame(() => {
                isRestoringScrollRef.current = false;
            });
        }
    }, [tab.id]); // Only depend on tab.id, not openTabs

    // Save scroll position when scrolling (debounced)
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Skip if we're restoring scroll position
        if (isRestoringScrollRef.current) return;

        const scrollTop = e.currentTarget.scrollTop;

        // Debounce: clear previous timeout and set new one
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) => (t.id === tab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t))
            );
        }, 100); // Save after 100ms of no scrolling
    }, [tab.id, setOpenTabs]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="w-full h-[100vh] flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Content */}
            <div ref={contentRef} onScroll={handleScroll} id="noteEditorContent" className="h-[100vh] flex-1 overflow-auto bg-background">
                <NoteDetailContent />
            </div>
        </div>
    );
}
