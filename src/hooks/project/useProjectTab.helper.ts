/**
 * Project Tab Helper
 * Helper functions for managing project editor tabs
 */

import { Project } from "@/store/project/useProject.store";
import { BaseTab, MultiProjectTabData } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "../../store";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";

export const useProjectTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabsStore();
    const { updateActiveTab } = useEditorTabHelper();
    const { setNewTabAnd } = useEditorTabHelper();

    /**
     * Open project in editor tab
     * If tab already exists, activate it; otherwise create new tab
     */
    const openProjectTab = (project: Project) => {
        // Check if tab already exists for this project
        const existingTab = openTabs.find((tab) => tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === project.id);

        if (existingTab) {
            // Tab already exists, just activate it
            updateActiveTab(existingTab.id);
        } else {
            // Create new project tab
            const newTab: BaseTab = {
                id: `project-tab-${project.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.project,
                data: project,
                data0: project,
                title: project.name || "Unsaved Project",
                hasUnsavedChanges: false,
            };

            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            updateActiveTab(newTab.id, newTabs);
        }
    };

    /**
     * Close project tab
     */
    const closeProjectTab = (tabId: string) => {
        setOpenTabs((prev) => {
            const newTabs = prev.filter((t) => t.id !== tabId);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Switch to the last tab
                    const lastTab = newTabs[newTabs.length - 1];
                    setNewTabAnd(lastTab.id);
                } else {
                    setNewTabAnd(null);
                }
            }

            return newTabs;
        });
    };

    /**
     * Update project in all tabs
     * When project is updated, sync it across all open tabs
     */
    const updateProjectInTabs = (projectId: number, updatedProject: Partial<Project>) => {
        setOpenTabs((prev) =>
            prev.map((tab) => {
                if (tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === projectId) {
                    const projectData = tab.data as Project;
                    return {
                        ...tab,
                        data: { ...projectData, ...updatedProject },
                        title: updatedProject.name || tab.title,
                    };
                }
                return tab;
            })
        );
    };

    /**
     * Open multiple projects in a combined view tab (singleton)
     * Only one multi-project tab can exist at a time
     * If tab exists, activate and update its data; otherwise create new tab
     * Tab stays open even with empty selection (shows empty state)
     */
    const openMultiProjectTab = (projects: Project[]) => {
        // Check if multi-project tab already exists (singleton)
        const existingTab = openTabs.find((tab) => tab.type === constants.vscode.tab.tabTypes.multiProject);

        const projectIds = projects.map((p) => p.id);
        const tabData: MultiProjectTabData = {
            projectIds,
            projects,
        };

        if (existingTab) {
            // Tab exists - update its data and activate it
            setOpenTabs((prev) =>
                prev.map((tab) =>
                    tab.type === constants.vscode.tab.tabTypes.multiProject
                        ? { ...tab, data: tabData, data0: tabData }
                        : tab
                )
            );
            updateActiveTab(existingTab.id);
        } else {
            // Create new multi-project tab — pinned at first position
            const newTab: BaseTab = {
                id: `multi-project-tab-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.multiProject,
                data: tabData,
                data0: tabData,
                title: "Multiple-Projects",
                hasUnsavedChanges: false,
                isPinned: true,
            };

            const newTabs = [newTab, ...openTabs];
            setOpenTabs(newTabs);
            updateActiveTab(newTab.id, newTabs);
        }
    };

    /**
     * Update multi-project tab data when selection changes
     * Called when user clicks to select/deselect projects
     * Tab stays open even with empty selection (shows empty state)
     */
    const updateMultiProjectTabIfOpen = (projects: Project[]) => {
        const existingTab = openTabs.find((tab) => tab.type === constants.vscode.tab.tabTypes.multiProject);

        if (!existingTab) return; // No multi-project tab open, do nothing

        // Update tab data (even if empty)
        const projectIds = projects.map((p) => p.id);
        const tabData: MultiProjectTabData = {
            projectIds,
            projects,
        };

        setOpenTabs((prev) =>
            prev.map((tab) =>
                tab.type === constants.vscode.tab.tabTypes.multiProject
                    ? { ...tab, data: tabData, data0: tabData }
                    : tab
            )
        );
    };

    return {
        openProjectTab,
        openMultiProjectTab,
        updateMultiProjectTabIfOpen,
        closeProjectTab,
        updateProjectInTabs,
    };
};
