/**
 * Project Editor Panel Headless
 * Side-effects only (useEffect). Handles projectId/tabId sync, unsaved changes, scroll restore.
 * NO props — reads active tab from stores.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useEditorTabBarHelper } from "@/shell";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import {Project} from "../types/project.types";

export function useProjectEditorPanelHeadless() {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { setProjectId, setTabId, contentRef } = useProjectDetailStore();

    const activeTab = getActiveTab();
    const project = activeTab?.data as Project | undefined;

    // Effect 1: Sync projectId + tabId to store so children can read without props
    useEffect(() => {
        if (activeTab && project) {
            setProjectId(project.id);
            setTabId(activeTab.id);
        }
    }, [activeTab?.id, project?.id]);

    // Effect 2: Sync hasUnsavedChanges
    useEffect(() => {
        if (!activeTab) return;
        patchTab(activeTab.id, {
            hasUnsavedChanges: activeTab.data && activeTab.data0
                ? JSON.stringify(activeTab.data) !== JSON.stringify(activeTab.data0)
                : false,
        });
    }, [activeTab?.id, activeTab?.data]);

    // Effect 3: Restore scroll position when tab becomes active
    useEffect(() => {
        if (!activeTab) return;
        const viewState = activeTab.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [activeTab?.id]);

    return null;
}
