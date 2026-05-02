/**
 * useMultiProjectTaskFlowProcessHelper — toggle process checklist items on flow nodes.
 */

import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useAuthStore } from "@/shared";
import { taskService, parseChecklistJson, checklistProgress, toggleChecklistItem, getItemCheckState, flatItemIndex, getFlatItems } from "@/features/taskDetail";
import { toLocalISOString } from "@/shared";
import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";

export const useMultiProjectTaskFlowProcessHelper = () => {
    const { setFlowNodes, flowNodes } = useMultiTaskFlowStore();
    const { setTasks } = useMpTaskStore();
    const { $user } = useAuthStore();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();

    const handleToggleProcess =
        async (nodeId: string, gi: number, ii: number) => {
            const node = flowNodes.find((n) => n.id === nodeId);
            if (!node) return;
            const task = (node.data as TaskFlowNodeData).task;

            const isInProgress = task.status === "in_progress";
            const isBgProgress = task.status === "background_progress";
            const canToggleProcess = (isInProgress || isBgProgress) && !isNodeLocked(nodeId);

            const parsedProcess = parseChecklistJson(task.processJson ?? null);
            if (!parsedProcess || !canToggleProcess) return;

            const item = parsedProcess.groups[gi]?.items[ii];
            if (!item) return;

            if (!item.isOptional) {
                const fi = flatItemIndex(parsedProcess, gi, ii);
                const s = getItemCheckState(item);
                if (!s.isChecked && !s.isSkipped) {
                    const flat = getFlatItems(parsedProcess);
                    let nextReq = flat.length;
                    for (let i = 0; i < flat.length; i++) {
                        if (flat[i].isOptional) continue;
                        const fs = getItemCheckState(flat[i]);
                        if (!fs.isChecked && !fs.isSkipped) { nextReq = i; break; }
                    }
                    if (fi > nextReq) return;
                }
            }

            const newJson = toggleChecklistItem(parsedProcess, gi, ii, "check");
            const newJsonStr = JSON.stringify(newJson);
            const oldProcessJson = task.processJson;
            const { done, total } = checklistProgress(newJson);
            const allDone = total > 0 && done === total;

            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, processJson: newJsonStr, ...(allDone ? { status: "completed" } : {}) } } }
                        : n,
                ),
            );
            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, processJson: newJsonStr, ...(allDone ? { status: "completed" as const } : {}) } : t)));

            try {
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: task.title, note: task.note,
                    status: allDone ? "completed" : task.status,
                    priority: task.priority, startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: newJsonStr, customTabsJson: task.customTabsJson,
                }]);
                if (!result.success) throw new Error();
            } catch {
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, processJson: oldProcessJson, ...(allDone ? { status: task.status } : {}) } } }
                            : n,
                    ),
                );
                setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, processJson: oldProcessJson, ...(allDone ? { status: task.status } : {}) } : t)));
            }
        }

    return { handleToggleProcess };
};
