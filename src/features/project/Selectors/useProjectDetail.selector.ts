/**
 * ProjectDetail Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Reads from stores directly — NO params.
 */

import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { projectConstants } from "@/features/project/project.constants";
import { shellConstants } from "@/shell";
import { constants, useGetStandardRegistry } from "@/shared";
import { getProjectStatusColors } from "../Components/ProjectStatusBadge";
import type { IStatusOption } from "@/shared";
import type { TabType } from "../types/projectDetail.type";
import { useEditorTabBarHelper } from "@/shell";
import {Project} from "../types/project.types";

export const useProjectDetailSelector = () => {
    const { openTabs, getActiveTab } = useEditorTabBarHelper();
    const { projectId, tabId } = useProjectDetailStore();

    // Current editor tab
    const currentTab = getActiveTab(tabId) || null;

    // Active inner tab from editor tab metadata
    const activeTab: TabType = (currentTab?.metadata?.innerTab as TabType) || "general";

    // Get project data from the open tab
    const projectTab = openTabs.find(
        (tab) => tab.type === shellConstants.vscode.tab.tabTypes.project && (tab.data as Project).id === projectId,
    );
    const selectedProject = projectTab ? (projectTab.data as Project) : undefined;

    // Whether to show task filter button
    const showTaskFilter = activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline";

    // Project status options for autocomplete
    const projectStatuses = useGetStandardRegistry("project_status");
    const statusOptions: IStatusOption[] = projectStatuses
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
        .sort(
            (a, b) =>
                (projectConstants.optionOrder.projectStatuses[a.label] ?? 999) -
                (projectConstants.optionOrder.projectStatuses[b.label] ?? 999),
        );

    // Current status value for autocomplete
    const currentStatusValue: IStatusOption | null = statusOptions.find((option) => option.code === selectedProject?.status) || null;

    // Check if project is inactive (soft deleted, completed, or dropped)
    const isDeleted = selectedProject?.deletedAt != null;
    const isCompleted = selectedProject?.status === "completed" || selectedProject?.status === "dropped";
    const isDisabled = isDeleted || isCompleted;

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
