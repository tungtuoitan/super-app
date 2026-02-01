/**
 * Multi-Project Editor Panel
 * Editor panel for multi-project tabs in VSCodeLayout
 * Shows combined view of tasks from multiple selected projects
 */

import React, { useEffect } from "react";
import type { BaseTab, MultiProjectTabData } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { MultiProjectDetailContent } from "./MultiProjectDetailContent";

interface MultiProjectEditorPanelProps {
    tab: BaseTab;
}

export function MultiProjectEditorPanel({ tab }: MultiProjectEditorPanelProps) {
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Get multi-project data from tab
    const multiProjectData = tab.data as MultiProjectTabData;

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
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-hidden bg-background">
                <MultiProjectDetailContent projectIds={multiProjectData.projectIds} projects={multiProjectData.projects} />
            </div>
        </div>
    );
}
