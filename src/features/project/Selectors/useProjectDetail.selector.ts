/**
 * ProjectDetail Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Reads from stores directly — NO params.
 */

import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { useGeneralStore } from "@/shared/store/General.store";
import { constants } from "@/utils/index";
import { getProjectStatusColors } from "../Components/ProjectStatusBadge";
import type { IStatusOption } from "@/shared/components";
import type { TabType } from "../types/projectDetail.type";
import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";
import {Project} from "../types/project.types";

export const useProjectDetailSelector = () => {
    const { openTabs } = useEditorTabBarStore();
    const { projectId, tabId } = useProjectDetailStore();
    const { registriesByType } = useGeneralStore();

    // Current editor tab
    const currentTab = openTabs.find((t) => t.id === tabId) || null;

    // Active inner tab from editor tab metadata
    const activeTab: TabType = (currentTab?.metadata?.innerTab as TabType) || "general";

    // Get project data from the open tab
    const selectedProject = (() => {
        const projectTab = openTabs.find(
            (tab) => tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === projectId,
        );
        return projectTab ? (projectTab.data as Project) : undefined;
    })()

    // Whether to show task filter button
    const showTaskFilter = activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline";
    

    // Project status options for autocomplete
    const statusOptions: IStatusOption[] = (() => {
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
    })()

    // Current status value for autocomplete
    const currentStatusValue: IStatusOption | null = statusOptions.find((option) => option.code === selectedProject?.status) || null;

    // Check if project is inactive (soft deleted, completed, or dropped)
    const isDisabled = (() => {
        const isDeleted = selectedProject?.deletedAt !== null && selectedProject?.deletedAt !== undefined;
        const isCompleted = selectedProject?.status === "completed" || selectedProject?.status === "dropped";
        return isDeleted || isCompleted;
    })()

    // Whether the project is soft-deleted (for disabling status only)
    const isDeleted = (() => {
        return selectedProject?.deletedAt !== null && selectedProject?.deletedAt !== undefined;
    })()

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
