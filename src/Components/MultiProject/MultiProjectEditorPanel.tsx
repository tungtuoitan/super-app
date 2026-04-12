/**
 * Multi-Project Editor Panel
 * Editor panel for multi-project tabs in VSCodeLayout.
 * NO props — reads active tab from useEditorTabHelper.
 * Provider is in Main.tsx.
 */

import React from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { MultiProjectDetailContent } from "./MultiProjectDetailContent";

export function MultiProjectEditorPanel() {
    const { setOpenTabs } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    const contentRef = React.useRef<HTMLDivElement>(null);

    const activeTab = getActiveTab();
    if (!activeTab) return null;

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === activeTab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-hidden bg-background">
                <MultiProjectDetailContent />
            </div>
        </div>
    );
}
