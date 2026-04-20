import { useCurrentProjectStore } from "@/store/useCurrentProject.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
/**
 * Task Detail Selector
 * Derived / computed values from global store state.
 * No functions, no side effects — only useMemo & direct derivations.
 *
 * Provides: tab resolution, project context, disabled flags, dropdown options,
 *           current selected values, date limit bounds.
 */

import { useMemo } from "react";
import { Task, useTaskStore } from "../store/useTask.store";
import { useGeneralStore } from "@/store/General.store";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { IStatusOption } from "@/shared/components";

export const useTaskDetailSelector = () => {
    const { openTabs, activeTabId } = useEditorTabsStore();
    const { projects } = useCurrentProjectStore();
    const { projects: allProjects } = useProjectStore();
    const { tasks } = useTaskStore();
    const { registriesByType } = useGeneralStore();

    // ── Tab & task ────────────────────────────────────────────────────────────

    const taskTab = useMemo(
        () => openTabs.find((tab) => tab.id === activeTabId),
        [openTabs, activeTabId],
    );

    const selectedTask = taskTab ? (taskTab.data as Task) : undefined;

    // ── Project ───────────────────────────────────────────────────────────────

    const currentProject = useMemo(
        () => (selectedTask?.projectId
            ? (projects.find((p) => p.id === selectedTask.projectId) ?? allProjects.find((p) => p.id === selectedTask.projectId) ?? null)
            : null),
        [selectedTask?.projectId, projects, allProjects],
    );

    // ── Disabled flags ────────────────────────────────────────────────────────

    const isDeleted = selectedTask?.deletedAt != null;

    const isCompleted =
        selectedTask?.status === "completed" ||
        selectedTask?.status === "cancelled" ||
        selectedTask?.status === "on_hold" ||
        selectedTask?.status === "failed";

    const isProjectInactive =
        currentProject?.status === "completed" || currentProject?.status === "cancelled";

    const isDisabled = isDeleted || isCompleted || isProjectInactive;

    // ── Subtask check ─────────────────────────────────────────────────────────

    const hasSubtasks = useMemo(
        () => (selectedTask ? tasks.some((t) => t.parentTaskId === selectedTask.id) : false),
        [selectedTask, tasks],
    );

    // ── Dropdown options ──────────────────────────────────────────────────────

    const taskTypeOptions: IStatusOption[] = useMemo(
        () =>
            (registriesByType["taskType"] ?? []).map((reg) => ({
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: "",
                textColor: "",
            })),
        [registriesByType],
    );

    const statusOptions: IStatusOption[] = useMemo(() => {
        const colors = (code: string) =>
            constants.optionColor.taskStatus.colors[code] ?? constants.optionColor.taskStatus.default;
        return (registriesByType["task_status"] ?? [])
            .map((reg) => ({
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: colors(reg.code).bg,
                textColor: colors(reg.code).text,
            }))
            .sort(
                (a, b) =>
                    (constants.optionOrder.taskStatuses[a.label] ?? 999) -
                    (constants.optionOrder.taskStatuses[b.label] ?? 999),
            );
    }, [registriesByType]);

    const priorityOptions: IStatusOption[] = useMemo(() => {
        const colors = (code: string) =>
            constants.optionColor.taskPriority.colors[code] ?? constants.optionColor.taskPriority.default;
        return (registriesByType["task_priority"] ?? [])
            .map((reg) => ({
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: colors(reg.code).bg,
                textColor: colors(reg.code).text,
            }))
            .sort(
                (a, b) =>
                    (constants.optionOrder.taskPriorities[a.label] ?? 999) -
                    (constants.optionOrder.taskPriorities[b.label] ?? 999),
            );
    }, [registriesByType]);

    // ── Current selected option values ────────────────────────────────────────

    const currentStatusValue: IStatusOption | null =
        statusOptions.find((o) => o.code === selectedTask?.status) ?? null;

    const currentPriorityValue: IStatusOption | null =
        priorityOptions.find((o) => o.code === selectedTask?.priority) ?? null;

    const currentTaskTypeValue: IStatusOption | null =
        taskTypeOptions.find((o) => o.code === selectedTask?.taskType) ?? null;

    // ── Date limit bounds (for DateRangePicker warnings) ──────────────────────

    const limitDates = useMemo(() => {
        if (selectedTask?.parentTaskId) {
            return {
                limitStartDate: selectedTask.parentStartDate ?? null,
                limitEndDate: selectedTask.parentEndDate ?? null,
            };
        }
        return {
            limitStartDate: selectedTask?.projectStartDate ?? null,
            limitEndDate: selectedTask?.projectEndDate ?? null,
        };
    }, [
        selectedTask?.parentTaskId,
        selectedTask?.parentStartDate,
        selectedTask?.parentEndDate,
        selectedTask?.projectStartDate,
        selectedTask?.projectEndDate,
    ]);

    // ── Return ────────────────────────────────────────────────────────────────

    return {
        // tab resolution
        taskTab,
        selectedTask,
        // project
        currentProject,
        // flags
        isDeleted,
        isCompleted,
        isProjectInactive,
        isDisabled,
        hasSubtasks,
        // dropdown options
        taskTypeOptions,
        statusOptions,
        priorityOptions,
        // current selection
        currentStatusValue,
        currentPriorityValue,
        currentTaskTypeValue,
        // date bounds
        limitDates,
    };
};
