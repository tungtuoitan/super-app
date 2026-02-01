/**
 * Project Editor Panel
 * Editor panel for project tabs in VSCodeLayout
 * Toolbar is now shared in VSEditorArea
 */

import React, { useEffect } from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { ProjectDetailContent } from "./ProjectDetailContent";
import { Project } from "@/store/project/useProject.store";

interface ProjectEditorPanelProps {
    tab: BaseTab;
}

export function ProjectEditorPanel({ tab }: ProjectEditorPanelProps) {
    const { setOpenTabs, openTabs } = useEditorTabsStore();

    const contentRef = React.useRef<HTMLDivElement>(null);

    // Get project from tab data
    const project = tab.data as Project;

    // Sync hasUnsavedChanges with projectHasChanges
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
    }, [tab.id]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === tab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            {/* Content */}
            <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-hidden bg-background">
                <ProjectDetailContent projectId={project.id} />
            </div>
        </div>
    );
}
