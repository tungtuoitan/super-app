/**
 * MultiProject Task Flow Node Rename Helper
 * Rename callbacks: start / cancel / confirm (temp node → persist, or rename existing).
 */

import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useAuthStore } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { taskService, transformTaskData } from "@/features/taskDetail";
import type { TaskDTO } from "@/features/taskDetail";
import { flowService } from "@/shared";
import { toDateOnly } from "@/shared";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useTaskFolderHelper } from "@/features/taskDetail";
import { useProjectWorkspaceResolver } from "@/features/project";
import { useDebugLog } from "@/shared";

export const useMultiProjectTaskFlowNodeRenameHelper = () => {
    const { setFlowNodes, setEditingNodeId, taskFlowTasks, setTaskFlowTasks } = useMultiTaskFlowStore();
    const { flowNodes } = useMultiProjectTaskFlowSelector();
    const { setTasks } = useMpTaskStore();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();
    const { createTaskFolder } = useTaskFolderHelper();
    const { resolveWorkspaceId } = useProjectWorkspaceResolver();
    const debugLog = useDebugLog();
    // ── Rename ──────────────────────────────────────────────────────────────

    const handleRenameStart = (nodeId: string) => setEditingNodeId(nodeId)
    const handleRenameCancel = () => setEditingNodeId(null)

    const handleRenameConfirm = 
        async (nodeId: string, newTitle: string) => {
            const isTempNode = nodeId.startsWith("temp-node-");
            const trimmed = newTitle.trim();

            // ── Temp node: create task or discard ───────────────────────────
            if (isTempNode) {
                setEditingNodeId(null);
                if (!trimmed) {
                    setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
                    return;
                }

                const tempNode = flowNodes.find((n) => n.id === nodeId);
                if (!tempNode) return;
                const tempData = tempNode.data as TaskFlowNodeData;

                // Optimistic: show trimmed title immediately (prevents "Untitled" flash)
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...tempData, task: { ...tempData.task, title: trimmed } } }
                            : n,
                    ),
                );

                try {
                    const taskResult = await taskService._upsertTaskBatch($user.userToken, [{
                        projectId: tempData.task.projectId,
                        parentTaskId: null,
                        type: tempData.task.type,
                        title: trimmed,
                        status: "open",
                        priority: "medium",
                        orderIndex: 0,
                        description: null,
                        startDate: null,
                        endDate: null,
                        checklistJson: null,
                        processJson: null,
                        customTabsJson: null,
                        isMilestone: false,
                    }]);

                    if (!taskResult.success || !taskResult.data?.length) throw new Error(taskResult.message);
                    const [newTask] = transformTaskData([taskResult.data[0] as unknown as TaskDTO]);
                    const realId = String(newTask.id);

                    debugLog.log("task-upsert", "flow-task-created", {
                        taskId: newTask.id,
                        folderWorkspaceItemId: newTask.folderWorkspaceItemId,
                        title: trimmed,
                        source: "useMultiProjectTaskFlowNode",
                    });

                    setFlowNodes((prev) =>
                        prev.map((n) =>
                            n.id === nodeId
                                ? { ...n, id: realId, data: { task: newTask, projectName: tempData.projectName } }
                                : n,
                        ),
                    );
                    setTasks((prev) => [...prev, newTask]);

                    flowService._upsertPositions($user.userToken, [
                        { nodeId: newTask.id, nodeType: "task", x: tempNode.position.x, y: tempNode.position.y },
                    ]).catch(() => {});

                    const workspaceId = await resolveWorkspaceId(newTask.projectId);
                    await createTaskFolder(newTask, workspaceId, (taskId, folderId) => {
                        // Update task store
                        setTasks((prev) => prev.map((t) =>
                            t.id === taskId ? { ...t, folderWorkspaceItemId: folderId } : t
                        ));
                        // Update flow node so openTaskTab(data.task) picks up folderWorkspaceItemId
                        setFlowNodes((prev) => prev.map((n) => {
                            const nodeData = n.data as TaskFlowNodeData;
                            if (nodeData?.task?.id === taskId) {
                                return { ...n, data: { ...nodeData, task: { ...nodeData.task, folderWorkspaceItemId: folderId } } };
                            }
                            return n;
                        }));
                    });

                    _console.success("Task created");
                    debugLog.flush();
                } catch {
                    setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
                    _console.error("Failed to create task");
                }
                return;
            }

            // ── Existing node: rename ───────────────────────────────────────
            setEditingNodeId(null);
            if (!trimmed) return;

            if (isNodeLocked(nodeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "rename", nodeId });
                return;
            }

            const taskId = parseInt(nodeId, 10);
            const task = taskFlowTasks.find((t) => t.id === taskId);
            if (!task || task.title === trimmed) return;

            setTaskFlowTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t)));
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t)));
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, title: trimmed } } }
                        : n,
                ),
            );

            try {
                debugLog.log("task-upsert", "flow-rename-upsert", {
                    taskId: task.id, folderWorkspaceItemId: task.folderWorkspaceItemId,
                    title: trimmed, source: "useMultiProjectTaskFlowNode.rename",
                });
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: trimmed, description: task.description, status: task.status,
                    priority: task.priority, startDate: toDateOnly(task.startDate),
                    endDate: toDateOnly(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: task.processJson, customTabsJson: task.customTabsJson,
                    isMilestone: task.isMilestone,
                }]);
                if (!result.success) throw new Error(result.message);
                _console.success("Task renamed");
            } catch {
                setTaskFlowTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: task.title } : t)));
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: task.title } : t)));
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, title: task.title } } }
                            : n,
                    ),
                );
                _console.error("Failed to rename task");
            }
        }

    return {
        handleRenameStart,
        handleRenameCancel,
        handleRenameConfirm,
    };
};
