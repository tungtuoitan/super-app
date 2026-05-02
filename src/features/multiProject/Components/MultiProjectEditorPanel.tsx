/**
 * Multi-Project Editor Panel
 * Editor panel for multi-project tabs in VSCodeLayout.
 * NO props — reads active tab from useEditorTabBarHelper.
 * Provider is in Main.tsx.
 */

import React from "react";
import { useEditorTabBarHelper } from "@/shell";
import { MultiProjectDetailContent } from "./MultiProjectDetailContent";

export function MultiProjectEditorPanel() {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const contentRef = React.useRef<HTMLDivElement>(null);

    const activeTab = getActiveTab();
    if (!activeTab) return null;

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        patchTab(activeTab.id, (cur) => ({ viewState: { ...cur.viewState, scrollTop } }));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-hidden bg-background">
                <MultiProjectDetailContent />
            </div>
        </div>
    );
}
