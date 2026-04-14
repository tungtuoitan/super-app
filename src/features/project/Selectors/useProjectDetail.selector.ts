/**
 * ProjectDetail Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Reads from stores directly — NO params.
 */

import { useMemo } from "react";
import { useEditorTabsStore } from "@/store/index";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { Project } from "../store/useProject.store";
import { useGeneralStore } from "@/store/general/General.store";
import { constants } from "@/utils/index";
import { getProjectStatusColors } from "../Components/ProjectStatusBadge";
import type { IStatusOption } from "@/shared/components";
import type { TabType } from "../types/projectDetail.type";

export const useProjectDetailSelector = () => {
    const { openTabs } = useEditorTabsStore();
    const { projectId, tabId } = useProjectDetailStore();
    const { registriesByType } = useGeneralStore();

    // Current editor tab
    const currentTab = useMemo(() => {
        return openTabs.find((t) => t.id === tabId) || null;
    }, [openTabs, tabId]);

    // Active inner tab from editor tab metadata
    const activeTab: TabType = useMemo(() => {
        return (currentTab?.metadata?.innerTab as TabType) || "general";
    }, [currentTab?.metadata?.innerTab]);

    // Get project data from the open tab
    const selectedProject = useMemo(() => {
        const projectTab = openTabs.find(
            (tab) => tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === projectId,
        );
        return projectTab ? (projectTab.data as Project) : undefined;
    }, [openTabs, projectId]);

    // Whether to show task filter button
    const showTaskFilter = useMemo(() => {
        return activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline";
    }, [activeTab]);

    // Project status options for autocomplete
    const statusOptions: IStatusOption[] = useMemo(() => {
        const projectStatuses = registriesByType["project_status"] || [];
        return projectStatuses
            .map((reg) => {
                const colors = getProjectStatusColors(reg.code);
                return {
                    id: reg.code,
                    code: reg.code,
                    label: reg.description || reg.code,
                    bgColor: colors.bg,
                    textColor: colors.text,
                };
            })
            .sort((a, b) =>
                (constants.optionOrder.projectStatuses[a.label] ?? 999) - (constants.optionOrder.projectStatuses[b.label] ?? 999),
            );
    }, [registriesByType]);

    // Current status value for autocomplete
    const currentStatusValue: IStatusOption | null = useMemo(() => {
        return statusOptions.find((option) => option.code === selectedProject?.status) || null;
    }, [statusOptions, selectedProject?.status]);

    // Check if project is inactive (soft deleted, completed, or dropped)
    const isDisabled = useMemo(() => {
        const isDeleted = selectedProject?.deletedAt !== null && selectedProject?.deletedAt !== undefined;
        const isCompleted = selectedProject?.status === "completed" || selectedProject?.status === "dropped";
        return isDeleted || isCompleted;
    }, [selectedProject?.deletedAt, selectedProject?.status]);

    // Whether the project is soft-deleted (for disabling status only)
    const isDeleted = useMemo(() => {
        return selectedProject?.deletedAt !== null && selectedProject?.deletedAt !== undefined;
    }, [selectedProject?.deletedAt]);

    return {
        currentTab,
        activeTab,
        selectedProject,
        showTaskFilter,
        statusOptions,
        currentStatusValue,
        isDisabled,
        isDeleted,
    };
};
