/**
 * Note Editor Panel
 * Reuses NoteDetailContent for editor area tabs
 * Toolbar is now shared in VSEditorArea
 */

import React, { useEffect } from "react";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { NoteDetailContent } from "../Note/NoteDetailContent";

interface NoteEditorPanelProps {
    tab: BaseTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    const contentRef = React.useRef<HTMLDivElement>(null);

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

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = openTabs.find((t: BaseTab) => t.id === tab.id)?.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab.id, openTabs]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === tab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
    };

    return (
        <div className="w-full h-[100vh] flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Content */}
            <div ref={contentRef} onScroll={handleScroll} id="noteEditorContent" className="h-[100vh] flex-1 overflow-auto bg-background">
                <NoteDetailContent />
            </div>
        </div>
    );
}
