/**
 * Multi-Project Editor Panel
 * Editor panel for multi-project tabs in VSCodeLayout.
 * NO props — reads active tab from useEditorTabBarHelper.
 * Provider is in Main.tsx.
 */

import React from "react";
import type { BaseTab } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import { MultiProjectDetailContent } from "./MultiProjectDetailContent";
import {useEditorTabBarStore} from "@/shell";

export function MultiProjectEditorPanel() {
    const { setOpenTabs } = useEditorTabBarStore();
    const { getActiveTab } = useEditorTabBarHelper();
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
