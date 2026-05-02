/**
 * Workspace Editor Panel
 * Editor panel for workspace tabs in VSCodeLayout
 * Toolbar is now shared in VSEditorArea
 */

import React, { useEffect } from "react";
import type { BaseTab } from "@/shell";
import { WsDetailContent } from "./WsDetailContent";
import { useEditorTabBarHelper } from "@/shell";

interface WsEditorPanelProps {
    tab: BaseTab;
}

export function WsEditorPanel({ tab }: WsEditorPanelProps) {
    const { patchTab, getActiveTab } = useEditorTabBarHelper();

    const contentRef = React.useRef<HTMLDivElement>(null);

    // Sync hasUnsavedChanges
    useEffect(() => {
        patchTab(tab.id, {
            hasUnsavedChanges: tab.data && tab.data0
                ? JSON.stringify(tab.data) !== JSON.stringify(tab.data0)
                : false,
        });
    }, [tab.id, tab.data]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = getActiveTab(tab.id)?.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab.id]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        patchTab(tab.id, (cur) => ({ viewState: { ...cur.viewState, scrollTop } }));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Content */}
            <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-auto bg-background">
                <WsDetailContent />
            </div>
        </div>
    );
}
