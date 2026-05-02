/**
 * Project Editor Panel
 * Editor panel for project tabs in VSCodeLayout
 * NO props — reads active tab from useEditorTabBarHelper.
 * All useEffect logic lives in ProjectEditorPanelHeadless.
 */

import React from "react";
import { useEditorTabBarHelper } from "@/shell";
import { ProjectDetailContent } from "./ProjectDetailContent";
import {useProjectDetailStore} from "../store/useProjectDetail.store";
import {useProjectEditorPanelHeadless} from "../hooks/ProjectEditorPanel.headless";

export function ProjectEditorPanel() {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { contentRef } = useProjectDetailStore();
    useProjectEditorPanelHeadless()

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
                <ProjectDetailContent />
            </div>
        </div>
    );
}
