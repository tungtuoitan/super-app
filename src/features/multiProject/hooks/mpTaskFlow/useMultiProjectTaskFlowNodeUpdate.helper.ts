/**
 * MultiProject Task Flow Node Update Helper
 * Change callbacks: project / status of a task node.
 */

import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useAuthStore } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { taskService } from "@/features/taskDetail";
import { toDateOnly } from "@/shared";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useDebugLog } from "@/shared";

export const useMultiProjectTaskFlowNodeUpdateHelper = () => {
    const { setFlowNodes, taskFlowTasks, setTaskFlowTasks } = useMultiTaskFlowStore();
    const { projectNameMap } = useMultiProjectTaskFlowSelector();
    const { tasks, setTasks } = useMpTaskStore();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();
    const debugLog = useDebugLog();

    // ── Change project of a task node ──────────────────────────────────────

    const handleChangeProject =
        async (nodeId: string, newProjectId: number) => {
            if (isNodeLocked(nodeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "changeProject", nodeId });
                return;
            }
            const taskId = parseInt(nodeId, 10);
            // Look up in taskFlowTasks first — contains ALL tasks regardless of selected-project filter,
            // so tasks on deleted/unselected projects (shown as "unknown") are still found.
            const task = taskFlowTasks.find((t) => t.id === taskId) ?? tasks.find((t) => t.id === taskId);
            if (!task || task.projectId === newProjectId) return;

            const newProjectName = projectNameMap.get(newProjectId) ?? "";

            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, projectId: newProjectId } : t)));
            setTaskFlowTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, projectId: newProjectId } : t)));
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, projectId: newProjectId }, projectName: newProjectName } }
                        : n,
                ),
            );

            try {
                debugLog.log("task-upsert", "flow-changeProject-upsert", {
                    taskId: task.id, folderWorkspaceItemId: task.folderWorkspaceItemId,
                    oldProjectId: task.projectId, newProjectId,
                    source: "useMultiProjectTaskFlowNode.changeProject",
                });
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: newProjectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: task.title, description: task.description, status: task.status,
                    priority: task.priority, startDate: toDateOnly(task.startDate),
                    endDate: toDateOnly(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: task.processJson, customTabsJson: task.customTabsJson,
                    isMilestone: task.isMilestone,
                }]);
                if (!result.success) throw new Error(result.message);
            } catch {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, projectId: task.projectId } : t)));
                setTaskFlowTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, projectId: task.projectId } : t)));
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, projectId: task.projectId }, projectName: projectNameMap.get(task.projectId) ?? "" } }
                            : n,
                    ),
                );
                _console.error("Failed to change project");
            }
        }

    // ── Change status of a task node ─────────────────────────────────────

    const handleChangeStatus =
        async (nodeId: string, newStatus: string) => {
            if (isNodeLocked(nodeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "changeStatus", nodeId, newStatus });
                return;
            }
            const taskId = parseInt(nodeId, 10);
            const task = taskFlowTasks.find((t) => t.id === taskId) ?? tasks.find((t) => t.id === taskId);
            if (!task || task.status === newStatus) return;

            const oldStatus = task.status;

            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
            setTaskFlowTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, status: newStatus } } }
                        : n,
                ),
            );

            try {
                debugLog.log("task-upsert", "flow-changeStatus-upsert", {
                    taskId: task.id, folderWorkspaceItemId: task.folderWorkspaceItemId,
                    oldStatus: task.status, newStatus,
                    source: "useMultiProjectTaskFlowNode.changeStatus",
                });
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: task.title, description: task.description, status: newStatus,
                    priority: task.priority, startDate: toDateOnly(task.startDate),
                    endDate: toDateOnly(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: task.processJson, customTabsJson: task.customTabsJson,
                    isMilestone: task.isMilestone,
                }]);
                if (!result.success) throw new Error(result.message);
            } catch {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
                setTaskFlowTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, status: oldStatus } } }
                            : n,
                    ),
                );
                _console.error("Failed to change status");
            }
        }

    return {
        handleChangeProject,
        handleChangeStatus,
    };
};
