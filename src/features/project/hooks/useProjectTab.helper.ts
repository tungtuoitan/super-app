/**
 * Project Tab Helper
 * Helper functions for managing project editor tabs.
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import type { MultiProjectTabData } from "@/shell";
import type { Project } from "../types/project.types";

const TAB_TYPE = shellConstants.vscode.tab.tabTypes.project;
const MULTI_TAB_TYPE = shellConstants.vscode.tab.tabTypes.multiProject;

export const useProjectTabHelper = () => {
    const { openTab, openSingletonTab, closeTab, updateTabData, updateSingletonData } =
        useEditorTabBarHelper();

    /**
     * Open project in editor tab.
     * If tab already exists → activate it. Otherwise → create new tab.
     */
    const openProjectTab = (project: Project) => {
        openTab(project, TAB_TYPE, {
            title: project.name || "Unsaved Project",
        });
    };

    /**
     * Close project tab — fires onTabClose module callbacks via shell.
     */
    const closeProjectTab = (tabId: string) => {
        closeTab(tabId);
    };

    /**
     * Sync updated project data into any open tabs showing this project.
     */
    const updateProjectInTabs = (projectId: number, updatedProject: Partial<Project>) => {
        updateTabData(
            TAB_TYPE,
            projectId,
            (current: Project) => ({ ...(current as Project), ...updatedProject }),
            updatedProject.name,
        );
    };

    /**
     * Open the multi-project tab (singleton, pinned at position 0).
     * If already open → update its data and activate. Otherwise → create.
     */
    const openMultiProjectTab = (projects: Project[]) => {
        const tabData: MultiProjectTabData = {
            projectIds: projects.map((p) => p.id),
            projects,
        };
        openSingletonTab(
            MULTI_TAB_TYPE,
            { title: "Multiple-Projects", isPinned: true },
            tabData,
            { position: 'first' },
        );
    };

    /**
     * Update multi-project tab data when selection changes.
     * Does nothing if the tab is not currently open.
     */
    const updateMultiProjectTabIfOpen = (projects: Project[]) => {
        const tabData: MultiProjectTabData = {
            projectIds: projects.map((p) => p.id),
            projects,
        };
        updateSingletonData(MULTI_TAB_TYPE, tabData);
    };

    return {
        openProjectTab,
        openMultiProjectTab,
        updateMultiProjectTabIfOpen,
        closeProjectTab,
        updateProjectInTabs,
    };
};
