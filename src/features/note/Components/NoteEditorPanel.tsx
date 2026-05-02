/**
 * Note Editor Panel
 * Reuses NoteDetailContent for editor area tabs
 */

import React, { useEffect, useRef } from "react";
import type { BaseTab } from "@/shell";
import { NoteDetailContent } from "./NoteDetailContent";
import { useEditorTabBarHelper } from "@/shell";
import { SCROLL_SAVE_DEBOUNCE_MS } from "../note.constants";

interface NoteEditorPanelProps {
    tab: BaseTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { patchTab, getActiveTab } = useEditorTabBarHelper();
    const contentRef = useRef<HTMLDivElement>(null);
    const isRestoringScrollRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track unsaved changes
    useEffect(() => {
        patchTab(tab.id, {
            hasUnsavedChanges: tab.data && tab.data0
                ? JSON.stringify(tab.data) !== JSON.stringify(tab.data0)
                : false,
        });
    }, [tab.id, tab.data]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const scrollTop = getActiveTab(tab.id)?.viewState?.scrollTop;

        if (contentRef.current && scrollTop !== undefined) {
            isRestoringScrollRef.current = true;
            contentRef.current.scrollTop = scrollTop;

            requestAnimationFrame(() => {
                isRestoringScrollRef.current = false;
            });
        }
    }, [tab.id]);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isRestoringScrollRef.current) return;

        const scrollTop = e.currentTarget.scrollTop;

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            patchTab(tab.id, (cur) => ({ viewState: { ...cur.viewState, scrollTop } }));
        }, SCROLL_SAVE_DEBOUNCE_MS);
    }


    return (
        <div className="w-full h-[100vh] flex flex-col overflow-hidden bg-[#f6f6f6]">
            <div ref={contentRef} onScroll={handleScroll} id="noteEditorContent" className="h-[100vh] flex-1 overflow-auto bg-background">
                <NoteDetailContent />
            </div>
        </div>
    );
}
