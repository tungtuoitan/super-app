/**
 * Task Detail Selector
 * Derived / computed values from global store state.
 * No functions, no side effects — only useMemo & direct derivations.
 *
 * Provides: tab resolution, project context, disabled flags, dropdown options,
 *           current selected values, date limit bounds.
 */

import { Task } from "../types/task.types";
import { useGeneralStore } from "@/shared/store/General.store";
import { constants } from "@/utils/constants";
import { IStatusOption } from "@/shared/components";
import {usePTaskStore} from "../store/usePTask.store";
import { useTaskDetailProjectStore } from "../store/useTaskDetailProject.store";
import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";

export const useTaskDetailSelector = () => {
    const { openTabs, activeTabId } = useEditorTabBarStore();
    const { projectsCache } = useTaskDetailProjectStore();
    const { tasks } = usePTaskStore();
    const { registriesByType } = useGeneralStore();

    // ── Tab & task ────────────────────────────────────────────────────────────

    const taskTab = openTabs.find((tab) => tab.id === activeTabId);

    const selectedTask = taskTab ? (taskTab.data as Task) : undefined;

    // ── Project ───────────────────────────────────────────────────────────────

    const currentProject = selectedTask?.projectId
            ? (projectsCache[selectedTask.projectId] ?? null)
            : null
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

    const hasSubtasks = selectedTask ? tasks.some((t) => t.parentTaskId === selectedTask.id) : false

    // ── Dropdown options ──────────────────────────────────────────────────────

    const taskTypeOptions: IStatusOption[] = (registriesByType["taskType"] ?? []).map((reg) => ({
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: "",
                textColor: "",
            }))

    const colors = (code: string) => constants.optionColor.taskStatus.colors[code] ?? constants.optionColor.taskStatus.default;
    const statusOptions: IStatusOption[] = (() => {
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
    })()

    const priorityOptions: IStatusOption[] = (() => {
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
    })()

    // ── Current selected option values ────────────────────────────────────────

    const currentStatusValue: IStatusOption | null =
        statusOptions.find((o) => o.code === selectedTask?.status) ?? null;

    const currentPriorityValue: IStatusOption | null =
        priorityOptions.find((o) => o.code === selectedTask?.priority) ?? null;

    const currentTaskTypeValue: IStatusOption | null =
        taskTypeOptions.find((o) => o.code === selectedTask?.taskType) ?? null;

    // ── Date limit bounds (for DateRangePicker warnings) ──────────────────────

    const limitDates = (() => {
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
    })()

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
