/**
 * Project Editor Panel Headless
 * Side-effects only (useEffect). Handles projectId/tabId sync, unsaved changes, scroll restore.
 * NO props — reads active tab from stores.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { Project } from "../store/useProject.store";
import { useProjectDetailStore } from "../store/useProjectDetail.store";

export function ProjectEditorPanelHeadless() {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    const { setProjectId, setTabId,contentRef } = useProjectDetailStore();

    const activeTab = getActiveTab();
    const project = activeTab?.data as Project | undefined;

    // Effect 1: Sync projectId + tabId to store so children can read without props
    useEffect(() => {
        if (activeTab && project) {
            setProjectId(project.id);
            setTabId(activeTab.id);
        }
    }, [activeTab?.id, project?.id, setProjectId, setTabId]);

    // Effect 2: Sync hasUnsavedChanges
    useEffect(() => {
        if (!activeTab) return;
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === activeTab.id
                    ? {
                          ...t,
                          hasUnsavedChanges: activeTab.data && activeTab.data0 ? JSON.stringify(activeTab.data) !== JSON.stringify(activeTab.data0) : false,
                      }
                    : t
            )
        );
    }, [activeTab?.id, activeTab?.data]);

    // Effect 3: Restore scroll position when tab becomes active
    useEffect(() => {
        if (!activeTab) return;
        const viewState = openTabs.find((t: BaseTab) => t.id === activeTab.id)?.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [activeTab?.id]);

    return null;
}
