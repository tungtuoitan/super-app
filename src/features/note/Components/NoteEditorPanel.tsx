/**
 * Note Editor Panel
 * Reuses NoteDetailContent for editor area tabs
 */

import React, { useEffect, useRef, useCallback } from "react";
import { useEditorTabBarStore } from "@/store/index";
import { BaseTab } from "@/shell/types/tab.types";
import { NoteDetailContent } from "./NoteDetailContent";

interface NoteEditorPanelProps {
    tab: BaseTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { setOpenTabs, openTabs } = useEditorTabBarStore();
    const contentRef = useRef<HTMLDivElement>(null);
    const isRestoringScrollRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    useEffect(() => {
        const currentTab = openTabs.find((t: BaseTab) => t.id === tab.id);
        const scrollTop = currentTab?.viewState?.scrollTop;

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
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) => (t.id === tab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t))
            );
        }, 100);
    }


    return (
        <div className="w-full h-[100vh] flex flex-col overflow-hidden bg-[#f6f6f6]">
            <div ref={contentRef} onScroll={handleScroll} id="noteEditorContent" className="h-[100vh] flex-1 overflow-auto bg-background">
                <NoteDetailContent />
            </div>
        </div>
    );
}
