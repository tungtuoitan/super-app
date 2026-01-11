/**
 * Workspace Editor Panel
 * Editor panel for workspace tabs in VSCodeLayout
 * Toolbar is now shared in VSEditorArea
 */

import React, { useEffect } from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { Ws } from "@/types/workspace.types";
import { useEditorTabsStore } from "@/store/index";
import { WsDetailContent } from "./WsDetailContent";

interface WsEditorPanelProps {
    tab: BaseTab;
}

export function WsEditorPanel({ tab }: WsEditorPanelProps) {
    const { originalWsRef } = useWsDetailStore();
    const { setOpenTabs, openTabs } = useEditorTabsStore();

    const contentRef = React.useRef<HTMLDivElement>(null);

    // Get selectedWs from tab data
    const selectedWs = tab.data as Ws;

    // Calculate hasChanges by comparing selectedWs with original
    const wsHasChanges = selectedWs && originalWsRef.current
        ? JSON.stringify(selectedWs) !== JSON.stringify(originalWsRef.current)
        : false;

    // Sync hasUnsavedChanges with wsHasChanges
    useEffect(() => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === tab.id
                    ? {
                          ...t,
                          hasUnsavedChanges: wsHasChanges,
                      }
                    : t,
            ),
        );
    }, [wsHasChanges, tab.id, setOpenTabs]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = openTabs.find((t: BaseTab) => t.id === tab.id)?.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab.id]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === tab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
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
