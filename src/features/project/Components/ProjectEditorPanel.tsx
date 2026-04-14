/**
 * Project Editor Panel
 * Editor panel for project tabs in VSCodeLayout
 * NO props — reads active tab from useEditorTabHelper.
 * All useEffect logic lives in ProjectEditorPanelHeadless.
 */

import React from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { ProjectDetailContent } from "./ProjectDetailContent";
import { ProjectEditorPanelHeadless } from "../HeadlessComponents/ProjectEditorPanelHeadless";
import {useProjectDetailStore} from "../store/useProjectDetail.store";

export function ProjectEditorPanel() {
    const { setOpenTabs } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    const { contentRef } = useProjectDetailStore();

    const activeTab = getActiveTab();

    if (!activeTab) return null;

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === activeTab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <ProjectEditorPanelHeadless />
            <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-hidden bg-background">
                <ProjectDetailContent />
            </div>
        </div>
    );
}
