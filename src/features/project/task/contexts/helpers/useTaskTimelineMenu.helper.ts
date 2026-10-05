/**
 * Task Timeline Menu Helper — Pattern B
 * Right-click on a task bar / task-name row in the project & multi-project timelines.
 * contextData only carries the taskId; the task is looked up in PTask / MpTask stores.
 * Status change = PATCH /api/task/{id} { status } (dates untouched), optimistic in every store.
 */

import { useMenuContext, useMenuContextHelper, useAuthStore, useConsoleHelper, useGetStandardRegistry } from "@/shared";
import type { TaskTimelineMenuData, StandardRegistry } from "@/shared";
import { shellConstants, useEditorTabBarHelper } from "@/shell";
import { taskService, getTaskStatusColors, TIMELINE_QUICK_STATUSES } from "@/features/taskDetail";
import type { Task } from "@/features/taskDetail";
import { usePTaskStore } from "@/features/project/store/usePTask.store";
import { useMpTaskStore } from "@/features/multiProject";

export const useTaskTimelineMenuHelper = () => {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { openTabs, patchTab } = useEditorTabBarHelper();
    const { tasks: pTasks, setTasks: setPTasks, setAllTasks: setPAllTasks } = usePTaskStore();
    const { tasks: mpTasks, setTasks: setMpTasks } = useMpTaskStore();
    const taskStatuses: StandardRegistry[] = useGetStandardRegistry("task_status");

    const data = contextData as TaskTimelineMenuData | null;
    const taskId = data?.taskId ?? 0;
    const task = pTasks.find((t) => t.id === taskId) ?? mpTasks.find((t) => t.id === taskId) ?? null;
    const currentStatus = task?.status ?? null;
    const isEditable = !!task && task.id > 0 && !task.deletedAt;

    const statusOptions = TIMELINE_QUICK_STATUSES.map((code) => ({
        code,
        label: taskStatuses.find((reg) => reg.code === code)?.description || code,
        color: getTaskStatusColors(code).bg,
    }));

    const applyStatus = (status: string) => {
        const patchTask = (t: Task) => (t.id === taskId ? { ...t, status } : t);
        setPTasks((prev) => prev.map(patchTask));
        setPAllTasks((prev) => prev.map(patchTask));
        setMpTasks((prev) => prev.map(patchTask));

        // Keep an open task tab in sync — status only, don't touch unsaved edits
        for (const tab of openTabs) {
            if (tab.type === shellConstants.vscode.tab.tabTypes.task && (tab.data as Task).id === taskId) {
                patchTab(tab.id, (cur) => ({
                    data: { ...(cur.data as Task), status },
                    data0: cur.data0 ? { ...(cur.data0 as Task), status } : cur.data0,
                }));
            }
        }
    };

    const changeStatus = async (status: string) => {
        setIsMenuContextOpen(false);
        if (!task || !isEditable || task.status === status) return;

        const oldStatus = task.status;
        applyStatus(status);

        try {
            const result = await taskService._patchTask($user.userToken, task.id, { status });
            if (!result.success) throw new Error(result.message);
        } catch (error) {
            applyStatus(oldStatus);
            console.error("Failed to update task status:", error);
            _console.error("Failed to update task status");
        }
    };

    return {
        statusOptions,
        currentStatus,
        isEditable,
        changeStatus,
    };
};
