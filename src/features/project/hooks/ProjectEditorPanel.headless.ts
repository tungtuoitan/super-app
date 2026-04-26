/**
 * Project Editor Panel Headless
 * Side-effects only (useEffect). Handles projectId/tabId sync, unsaved changes, scroll restore.
 * NO props — reads active tab from stores.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabBarStore } from "@/store/index";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { Project, useProjectStore } from "../store/useProject.store";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { useCurrentProjectStore } from "@/store/useCurrentProject.store";

export function useProjectEditorPanelHeadless() {
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const { getActiveTab } = useEditorTabHelper();
    const { setProjectId, setTabId, contentRef } = useProjectDetailStore();
    const { projects } = useProjectStore();
    const { setProjectId: setGridProjectId, setCurrentProject, setProjects: setGridProjects } = useCurrentProjectStore();

    const activeTab = getActiveTab();
    const project = activeTab?.data as Project | undefined;

    // Effect 1: Sync projectId + tabId to store so children can read without props
    useEffect(() => {
        if (activeTab && project) {
            setProjectId(project.id);
            setTabId(activeTab.id);
            // Sync to GridControlStore so task selectors/helpers can read without importing project stores
            setGridProjectId(project.id);
            setCurrentProject(project);
        }
    }, [activeTab?.id, project?.id]);

    // Sync projects list to GridControlStore when projects load/change
    useEffect(() => {
        setGridProjects(projects);
    }, [projects]);

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
